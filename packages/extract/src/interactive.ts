import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

import { applyTranslations, isUntranslated } from './lib/apply';
import { copyToClipboard, readClipboard } from './lib/clipboard';
import { findConfigFile, parseConfig, type LinguoConfig } from './lib/config';
import { parsePo, serializePo } from './lib/po';
import { buildTranslationPrompt, localeLabel } from './lib/prompt';
import { compileCatalogs, extractToCatalogs, type ExtractStats } from './lib/runner';

/**
 * The `@clack/prompts` module, loaded lazily via dynamic `import()`. clack is
 * ESM-only, so it cannot be `require`d from this CommonJS package — but Node
 * lets CommonJS `import()` an ESM module at runtime.
 */
type Prompts = typeof import('@clack/prompts');

// ── Banner ───────────────────────────────────────────────────────────────────

/** A fixed-width block font (5 rows per letter) for the letters in "linguo". */
const GLYPH_ROWS = 5;
const GLYPHS: Record<string, readonly string[]> = {
  l: ['█   ', '█   ', '█   ', '█   ', '████'],
  i: ['███', ' █ ', ' █ ', ' █ ', '███'],
  n: ['█  █', '██ █', '█ ██', '█  █', '█  █'],
  g: ['████', '█   ', '█ ██', '█  █', '████'],
  u: ['█  █', '█  █', '█  █', '█  █', '████'],
  o: ['████', '█  █', '█  █', '█  █', '████'],
};

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

/** The cyan→fuchsia gradient RGB at position `t` in `[0, 1]`. */
function gradientRgb(t: number): [number, number, number] {
  return [lerp(56, 232, t), lerp(189, 121, t), lerp(248, 249, t)];
}

/** A cyan→fuchsia gradient colour for position `t` in `[0, 1]`. */
function gradient(t: number): string {
  const [r, g, b] = gradientRgb(t);
  return `\x1b[38;2;${r};${g};${b}m`;
}

/** Wrap text in a 24-bit colour. */
function rgb(r: number, g: number, b: number, text: string): string {
  return `\x1b[38;2;${r};${g};${b}m${text}${RESET}`;
}

/** Paint a line of text with the horizontal gradient. */
function paintGradient(line: string): string {
  const width = line.length;
  let out = BOLD;
  for (let i = 0; i < width; i += 1) {
    out += gradient(width <= 1 ? 0 : i / (width - 1)) + (line[i] ?? ' ');
  }
  return out + RESET;
}

type Rgb = readonly [number, number, number];

/** Pick a random element from a non-empty list. */
function pick<T>(arr: readonly [T, ...T[]]): T {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
}

// Palette + glyphs for the procedural "growth" sprouting from the letters.
const GREENS: readonly [Rgb, ...Rgb[]] = [
  [74, 222, 128],
  [34, 197, 94],
  [132, 204, 22],
  [22, 163, 74],
  [163, 230, 53],
];
const BLOOMS: readonly [Rgb, ...Rgb[]] = [
  [244, 114, 182],
  [251, 191, 36],
  [248, 113, 113],
  [167, 139, 250],
  [249, 168, 212],
  [226, 232, 240],
];
const GRASS: readonly [string, ...string[]] = ["'", ',', '.', '`', '*', 'ʻ'];
const STEMS: readonly [string, ...string[]] = ['|', '¦', "'", '!'];
const HEADS: readonly [string, ...string[]] = ['❀', '✿', '❁', '✾', '⚘'];

/** Colour a growth glyph: flower heads bloom, everything else is grassy green. */
function colorGrowth(ch: string): string {
  if (ch === ' ') {
    return ' ';
  }
  const [r, g, b] = HEADS.includes(ch) ? pick(BLOOMS) : pick(GREENS);
  return rgb(r, g, b, ch);
}

/**
 * Build two growth rows (a base layer of grass and a sparser layer of taller
 * blades + flowers) that sprout, unevenly and randomly, from the top edge of
 * the letters — so the banner looks a little different every run.
 */
function growGarden(topRow: string, width: number): [string, string] {
  const tall = new Array<string>(width).fill(' ');
  const base = new Array<string>(width).fill(' ');
  for (let c = 0; c < width; c += 1) {
    if (topRow[c] !== '█') {
      continue;
    }
    const roll = Math.random();
    if (roll < 0.4) {
      continue; // bare patches keep the top edge uneven and organic
    }
    if (roll < 0.82) {
      base[c] = pick(GRASS);
      if (Math.random() < 0.25) {
        tall[c] = pick(GRASS);
      }
    } else {
      base[c] = pick(STEMS);
      tall[c] = pick(HEADS); // a flower on a stem
    }
  }
  return [tall.map(colorGrowth).join(''), base.map(colorGrowth).join('')];
}

/**
 * A coloured "pill" chip for a locale code. We deliberately avoid flag emoji:
 * Windows ships no country-flag glyphs, so 🇵🇱 renders as bare "PL" there. A
 * coloured background pill renders identically on every platform.
 */
function chip(label: string, t: number): string {
  const [r, g, b] = gradientRgb(t);
  const bg = `\x1b[48;2;${r};${g};${b}m`;
  const fg = '\x1b[38;2;17;20;28m';
  return `${bg}${fg}${BOLD} ${label} ${RESET}`;
}

/**
 * Print a large, artistic banner: the word "linguo" in a 2×-wide gradient block
 * font, with grass and flowers procedurally sprouting from the letters' top edge
 * (Terraria-style — different every run), a tagline, and a chip per locale.
 */
function printBanner(locales: readonly string[]): void {
  // Render each glyph row, doubling every cell horizontally for extra heft.
  const rawRows = Array.from({ length: GLYPH_ROWS }, (_unused, r) =>
    [...'linguo']
      .map((ch) => [...(GLYPHS[ch]?.[r] ?? '')].map((cell) => cell + cell).join(''))
      .join('  '),
  );
  const width = Math.max(...rawRows.map((line) => line.length));
  const art = rawRows.map((line) => paintGradient(line));
  const [tallGrowth, baseGrowth] = growGarden(rawRows[0] ?? '', width);

  const chips =
    locales.length > 0
      ? locales.map((l, i) => chip(l, locales.length > 1 ? i / (locales.length - 1) : 0)).join(' ')
      : chip('i18n', 0);

  const lines = [
    '',
    `   ${tallGrowth}`,
    `   ${baseGrowth}`,
    ...art.map((line) => `   ${line}`),
    '',
    `   ${rgb(147, 197, 253, '✦ Angular i18n')} ${DIM}— a modern translation toolkit${RESET}`,
    `   ${DIM}✺ extract  ✺ translate  ✺ compile${RESET}`,
    `   🌍  ${chips}`,
    '',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} kB`;
}

function formatStats(stats: ExtractStats): string {
  const width = Math.max(...stats.locales.map((l) => l.locale.length));
  return stats.locales
    .map(
      (l) =>
        `${l.locale.padEnd(width)}  ${String(l.total).padStart(3)} total   ` +
        `+${l.added} new  -${l.removed}  ${l.missing} missing`,
    )
    .join('\n');
}

// (merge + untranslated helpers live in ./lib/apply, unit-tested)

function countMissing(entries: readonly { readonly msgstr: string }[]): number {
  return entries.filter((e) => isUntranslated(e.msgstr)).length;
}

// ── Actions ──────────────────────────────────────────────────────────────────

function runExtract(p: Prompts, config: LinguoConfig, baseDir: string): void {
  const s = p.spinner();
  s.start('Scanning source for messages');
  const stats = extractToCatalogs({
    srcDir: resolve(baseDir, config.src),
    outDir: resolve(baseDir, config.catalogs),
    locales: config.locales,
    sourceLocale: config.sourceLocale,
    cwd: config.referenceBase === 'workspace' ? process.cwd() : baseDir,
  });
  s.stop(`Found ${stats.messages} message(s) in ${stats.files} file(s)`);
  p.note(formatStats(stats), 'Catalogs');
}

function runCompile(p: Prompts, config: LinguoConfig, baseDir: string): void {
  const s = p.spinner();
  s.start('Compiling catalogs to runtime JSON');
  compileCatalogs({
    poDir: resolve(baseDir, config.catalogs),
    outDir: resolve(baseDir, config.output),
  });
  const n = config.locales.length;
  s.stop(`Compiled ${n} dictionar${n === 1 ? 'y' : 'ies'} → ${config.output}`);
}

async function runTranslate(p: Prompts, config: LinguoConfig, baseDir: string): Promise<void> {
  const locale = await p.select({
    message: 'Which language do you want to translate?',
    options: config.locales.map((l) => ({ value: l, label: localeLabel(l) })),
  });
  if (p.isCancel(locale)) {
    return;
  }

  const poPath = resolve(baseDir, config.catalogs, `${locale}.po`);
  if (!existsSync(poPath)) {
    p.log.error(`No catalog at ${poPath}. Run "Extract messages" first.`);
    return;
  }

  const poText = readFileSync(poPath, 'utf8');
  const entries = parsePo(poText);
  const untranslated = entries.filter((e) => isUntranslated(e.msgstr));
  if (untranslated.length === 0) {
    p.log.success(`${localeLabel(locale)} is already fully translated.`);
    return;
  }

  // Only the untranslated entries go to the model — not the whole catalog.
  const prompt = buildTranslationPrompt(localeLabel(locale), serializePo(untranslated));
  if (copyToClipboard(prompt)) {
    p.note(
      `Copied a prompt for ${untranslated.length} untranslated entr${
        untranslated.length === 1 ? 'y' : 'ies'
      } (${formatBytes(prompt.length)}).\n` +
        `Paste it into an LLM, then copy the model's reply (the .po block) back\n` +
        `to your clipboard.`,
      `${localeLabel(locale)} · ${untranslated.length}/${entries.length} to translate`,
    );
  } else {
    const promptPath = resolve(baseDir, config.catalogs, `${locale}.prompt.txt`);
    writeFileSync(promptPath, prompt, 'utf8');
    p.note(`Clipboard unavailable — wrote the prompt to ${basename(promptPath)}.`, 'Heads up');
  }

  const next = await p.confirm({
    message: "Copied the model's reply? Read it back from the clipboard and apply it now?",
    initialValue: true,
  });
  if (p.isCancel(next) || !next) {
    p.log.info('No changes applied.');
    return;
  }

  const reply = readClipboard();
  if (reply === undefined || reply.trim() === '') {
    p.log.error('Could not read the clipboard.');
    return;
  }

  // Fold the reply's translations into the full catalog (matched by identity).
  const { po: mergedPo, applied } = applyTranslations(poText, reply);
  if (applied === 0) {
    p.log.warn('No matching translations found in the clipboard. Nothing changed.');
    return;
  }

  writeFileSync(poPath, mergedPo, 'utf8');
  runCompile(p, config, baseDir);

  const remaining = countMissing(parsePo(mergedPo));
  if (remaining === 0) {
    p.log.success(`Applied ${applied} translation(s). ${localeLabel(locale)} is fully translated.`);
  } else {
    p.log.success(
      `Applied ${applied} translation(s) · ${localeLabel(locale)} ${remaining} still missing.`,
    );
  }
}

// ── Menu ───────────────────────────────────────────────────────────────────

/**
 * Run the guided interactive menu (clack). Invoked by the CLI when it is given
 * no command and is attached to a TTY. Discovers `linguo.config.json`, then
 * loops: extract, compile, translate via an LLM, run the full pipeline, or exit.
 * All actions are also available non-interactively as commands.
 */
export async function runInteractive(): Promise<void> {
  const p = await import('@clack/prompts');

  const configPath = findConfigFile(process.cwd());
  let config: LinguoConfig | undefined;
  let configError: string | undefined;
  if (configPath !== undefined) {
    try {
      config = parseConfig(readFileSync(configPath, 'utf8'));
    } catch (error) {
      configError = error instanceof Error ? error.message : String(error);
    }
  }

  printBanner(config?.locales ?? []);
  p.intro('ng-linguo');

  if (configPath === undefined) {
    p.cancel('No linguo.config.json found. Create one, or run a command with --config.');
    return;
  }
  if (configError !== undefined || config === undefined) {
    p.cancel(configError ?? 'Could not read the configuration.');
    return;
  }
  const baseDir = dirname(configPath);
  p.log.info(`${configPath}\nLocales: ${config.locales.join(', ')}`);

  for (;;) {
    const action = await p.select({
      message: 'What do you want to do?',
      options: [
        { value: 'extract', label: 'Extract messages', hint: 'scan source → update .po catalogs' },
        { value: 'compile', label: 'Compile catalogs', hint: '.po → runtime .json' },
        { value: 'translate', label: 'Translate with an LLM', hint: 'copy prompt, paste reply' },
        { value: 'all', label: 'Run the full pipeline', hint: 'extract, then compile' },
        { value: 'exit', label: 'Exit' },
      ],
    });

    if (p.isCancel(action) || action === 'exit') {
      break;
    }
    if (action === 'extract' || action === 'all') {
      runExtract(p, config, baseDir);
    }
    if (action === 'compile' || action === 'all') {
      runCompile(p, config, baseDir);
    }
    if (action === 'translate') {
      await runTranslate(p, config, baseDir);
    }
  }

  p.outro('Goodbye 👋');
}
