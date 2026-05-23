#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { copyToClipboard } from './lib/clipboard';
import {
  CONFIG_SCHEMA_REF,
  DEFAULT_CONFIG,
  findConfigFile,
  parseConfig,
  serializeConfig,
  type LinguoConfig,
} from './lib/config';
import { buildTranslationPrompt, localeLabel, resolveTargetLocale } from './lib/prompt';
import { compileCatalogs, extractToCatalogs, type ExtractStats } from './lib/runner';
import { autoTranslateCatalog, loadTranslator } from './lib/translator';
import { runInit, runInteractive } from './interactive';

/** Flags that take a following value (`--name value`), used to skip them when
 * scanning for the positional argument. */
const VALUE_FLAGS = new Set([
  'config',
  'locales',
  'locale',
  'source-locale',
  'src',
  'catalogs',
  'out',
  'po',
  'reference-base',
  'translator',
]);

function flag(args: readonly string[], name: string): string | undefined {
  const prefix = `--${name}=`;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === `--${name}`) {
      return args[i + 1];
    }
    if (arg.startsWith(prefix)) {
      return arg.slice(prefix.length);
    }
  }
  return undefined;
}

/** Whether a boolean flag (`--name`) is present. */
function hasFlag(args: readonly string[], name: string): boolean {
  return args.includes(`--${name}`);
}

/** The first non-flag argument, skipping `--flag value` pairs. */
function positional(args: readonly string[]): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg.startsWith('--')) {
      // `--name value` (no `=`) consumes the next token as its value.
      if (!arg.includes('=') && VALUE_FLAGS.has(arg.slice(2))) {
        i += 1;
      }
      continue;
    }
    return arg;
  }
  return undefined;
}

interface Resolved {
  readonly config: LinguoConfig;
  /** Directory paths are resolved against (the config file's dir, else cwd). */
  readonly baseDir: string;
}

/** Resolve config from a `linguo.config.json` (if present) with flag overrides. */
function resolveConfig(rest: readonly string[]): Resolved {
  // Honor an explicit --config; otherwise discover the config by searching up
  // from the cwd, then down through the workspace (so it works from anywhere).
  const configPath = flag(rest, 'config') ?? findConfigFile(process.cwd());
  const fromFile =
    configPath !== undefined && existsSync(configPath)
      ? parseConfig(readFileSync(configPath, 'utf8'))
      : null;
  const baseDir =
    configPath !== undefined && fromFile ? dirname(resolve(configPath)) : process.cwd();

  const localesFlag = flag(rest, 'locales');
  const locales = localesFlag ? localesFlag.split(',').filter(Boolean) : fromFile?.locales;
  if (!locales || locales.length === 0) {
    throw new Error(
      'No locales. Provide --locales en,pl or a linguo.config.json with a "locales" array.',
    );
  }

  const refFlag = flag(rest, 'reference-base');
  const referenceBase =
    refFlag === 'workspace' || refFlag === 'config'
      ? refFlag
      : (fromFile?.referenceBase ?? DEFAULT_CONFIG.referenceBase);

  const translator = flag(rest, 'translator') ?? fromFile?.translator;

  return {
    baseDir,
    config: {
      locales,
      sourceLocale:
        flag(rest, 'source-locale') ?? fromFile?.sourceLocale ?? DEFAULT_CONFIG.sourceLocale,
      src: flag(rest, 'src') ?? fromFile?.src ?? DEFAULT_CONFIG.src,
      catalogs: flag(rest, 'catalogs') ?? fromFile?.catalogs ?? DEFAULT_CONFIG.catalogs,
      output: fromFile?.output ?? DEFAULT_CONFIG.output,
      referenceBase,
      ...(translator !== undefined ? { translator } : {}),
    },
  };
}

function pad(value: string | number, width: number): string {
  return String(value).padEnd(width);
}

function reportExtractStats(stats: ExtractStats): void {
  const lines = [`ng-linguo: ${stats.messages} message(s) found in ${stats.files} file(s)`];
  const width = Math.max(6, ...stats.locales.map((s) => s.locale.length));
  for (const s of stats.locales) {
    lines.push(
      `  ${pad(s.locale, width)}  ${pad(`${s.total} total`, 10)} ` +
        `+${pad(`${s.added} new`, 8)} -${pad(`${s.removed} removed`, 12)} ${s.missing} missing`,
    );
  }
  process.stdout.write(`${lines.join('\n')}\n`);
}

async function main(argv: readonly string[]): Promise<void> {
  const [command, ...rest] = argv;

  // No command on an interactive terminal → open the guided menu.
  if (command === undefined && process.stdin.isTTY && process.stdout.isTTY) {
    await runInteractive();
    return;
  }

  if (command === 'extract') {
    const { config, baseDir } = resolveConfig(rest);
    const stats = extractToCatalogs({
      srcDir: resolve(baseDir, config.src),
      outDir: resolve(baseDir, flag(rest, 'out') ?? config.catalogs),
      locales: config.locales,
      sourceLocale: config.sourceLocale,
      // 'workspace' makes #: refs relative to where the CLI runs (clickable);
      // 'config' keeps them relative to the config file (gettext-style).
      cwd: config.referenceBase === 'workspace' ? process.cwd() : baseDir,
    });
    reportExtractStats(stats);
    return;
  }

  if (command === 'compile') {
    const { config, baseDir } = resolveConfig(rest);
    compileCatalogs({
      poDir: resolve(baseDir, flag(rest, 'po') ?? config.catalogs),
      outDir: resolve(baseDir, flag(rest, 'out') ?? config.output),
    });
    return;
  }

  if (command === 'translate') {
    const { config, baseDir } = resolveConfig(rest);
    if (config.translator === undefined) {
      throw new Error(
        'translate: no "translator" configured. Add a "translator" module path to ' +
          'linguo.config.json (a module exporting a translate() function), or use ' +
          '"copyprompt" / the interactive menu for the clipboard flow.',
      );
    }

    const all = hasFlag(rest, 'all');
    const localeFlag = flag(rest, 'locale');
    if (!all && localeFlag === undefined) {
      throw new Error('translate: pass --locale <code> or --all.');
    }
    if (localeFlag !== undefined && !config.locales.includes(localeFlag)) {
      throw new Error(
        `translate: "${localeFlag}" is not a configured locale (${config.locales.join(', ')}).`,
      );
    }

    const requested = all ? config.locales : localeFlag !== undefined ? [localeFlag] : [];
    const targets = requested.filter((l) => l !== config.sourceLocale);
    if (targets.length === 0) {
      process.stdout.write('Nothing to translate (only the source locale was selected).\n');
      return;
    }

    const translate = await loadTranslator(resolve(baseDir, config.translator));
    let totalApplied = 0;
    for (const locale of targets) {
      const label = localeLabel(locale);
      const poPath = resolve(baseDir, config.catalogs, `${locale}.po`);
      if (!existsSync(poPath)) {
        process.stderr.write(
          `  ${label}: no catalog at ${poPath} — run "extract" first. Skipped.\n`,
        );
        continue;
      }
      const outcome = await autoTranslateCatalog({
        translate,
        poText: readFileSync(poPath, 'utf8'),
        targetLocale: locale,
        targetLabel: label,
        sourceLocale: config.sourceLocale,
      });
      if (outcome.untranslated === 0) {
        process.stdout.write(`  ${label}: already fully translated.\n`);
        continue;
      }
      writeFileSync(poPath, outcome.po, 'utf8');
      totalApplied += outcome.applied;
      const tail = outcome.remaining > 0 ? ` (${outcome.remaining} still missing)` : '';
      process.stdout.write(
        `  ${label}: applied ${outcome.applied}/${outcome.untranslated}${tail}.\n`,
      );
    }

    if (totalApplied > 0) {
      compileCatalogs({
        poDir: resolve(baseDir, config.catalogs),
        outDir: resolve(baseDir, config.output),
      });
      process.stdout.write(`Compiled catalogs → ${config.output}\n`);
    }
    return;
  }

  if (command === 'copyprompt') {
    const language = positional(rest);
    if (language === undefined) {
      throw new Error('Usage: copyprompt <language> (e.g. "Polski", "German", or "pl").');
    }

    const { config, baseDir } = resolveConfig(rest);
    const target = resolveTargetLocale(language, config.locales);
    if (!target) {
      throw new Error(
        `Could not match "${language}" to a configured locale. ` +
          `Configured locales: ${config.locales.join(', ')}.`,
      );
    }

    const poPath = resolve(baseDir, flag(rest, 'po') ?? config.catalogs, `${target.locale}.po`);
    if (!existsSync(poPath)) {
      throw new Error(`No catalog at ${poPath}. Run "linguo-extract extract" first.`);
    }

    const prompt = buildTranslationPrompt(target.label, readFileSync(poPath, 'utf8'));

    // `--stdout` prints the prompt instead of copying — useful for piping or
    // when no clipboard tool is available (CI, headless).
    if (hasFlag(rest, 'stdout')) {
      process.stdout.write(`${prompt}\n`);
      return;
    }

    if (copyToClipboard(prompt)) {
      process.stdout.write(
        `Copied translation prompt for ${target.label} to the clipboard ` +
          `(${prompt.length} chars). Paste it into an LLM, then save the reply over ${target.locale}.po.\n`,
      );
      return;
    }

    process.stderr.write(
      'Could not access the clipboard. Re-run with --stdout to print the prompt instead.\n',
    );
    process.exitCode = 1;
    return;
  }

  if (command === 'init') {
    // On a TTY (and without --locales), open the interactive create/edit form.
    if (process.stdin.isTTY && process.stdout.isTTY && flag(rest, 'locales') === undefined) {
      await runInit();
      return;
    }
    // Non-interactive: build from flags + defaults (scriptable / CI).
    const localesFlag = flag(rest, 'locales');
    if (localesFlag === undefined) {
      throw new Error(
        'init: provide --locales en,pl[,…] for non-interactive use, or run it in a terminal for the interactive form.',
      );
    }
    const locales = localesFlag.split(',').filter(Boolean);
    if (locales.length === 0) {
      throw new Error('init: --locales must list at least one locale code.');
    }
    const refFlag = flag(rest, 'reference-base');
    const config: LinguoConfig = {
      $schema: CONFIG_SCHEMA_REF,
      locales,
      sourceLocale: flag(rest, 'source-locale') ?? DEFAULT_CONFIG.sourceLocale,
      src: flag(rest, 'src') ?? DEFAULT_CONFIG.src,
      catalogs: flag(rest, 'catalogs') ?? DEFAULT_CONFIG.catalogs,
      output: flag(rest, 'out') ?? DEFAULT_CONFIG.output,
      referenceBase: refFlag === 'workspace' ? 'workspace' : DEFAULT_CONFIG.referenceBase,
    };
    const target = resolve(process.cwd(), flag(rest, 'config') ?? 'linguo.config.json');
    const existed = existsSync(target);
    if (existed && !hasFlag(rest, 'force')) {
      throw new Error(`${target} already exists. Pass --force to overwrite.`);
    }
    writeFileSync(target, serializeConfig(config), 'utf8');
    process.stdout.write(`${existed ? 'Overwrote' : 'Created'} ${target}\n`);
    return;
  }

  process.stderr.write(
    [
      'Usage: linguo-extract [command] [options]',
      '',
      'Run with no command in a terminal to open the guided interactive menu',
      '(which can also create or edit linguo.config.json).',
      'Reads linguo.config.json (found automatically, or --config <path>); flags override.',
      '',
      '  init    [--locales en,pl] [--source-locale en] [--src <dir>] [--catalogs <dir>]',
      '          [--out <dir>] [--reference-base config|workspace] [--force]',
      '          Create (or, in a terminal, create/edit) linguo.config.json.',
      '',
      '  extract [--config <path>] [--src <dir>] [--out <dir>] [--locales en,pl] [--source-locale en]',
      '          Scan sources and create/update <locale>.po catalogs.',
      '',
      '  compile [--config <path>] [--po <dir>] [--out <dir>]',
      '          Compile <locale>.po catalogs into runtime <locale>.json.',
      '',
      '  translate (--locale pl | --all) [--config <path>] [--translator <module>]',
      '          Translate missing entries automatically via the configured "translator"',
      '          module (one exporting a translate() function), then compile.',
      '',
      '  copyprompt <language> [--config <path>] [--po <dir>] [--stdout]',
      '          Copy an LLM translation prompt for <language>.po to the clipboard.',
      '          <language> may be a code (pl), English name (Polish), or endonym (Polski).',
      '',
    ].join('\n'),
  );
  process.exitCode = command === undefined ? 1 : 2;
}

main(process.argv.slice(2)).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
