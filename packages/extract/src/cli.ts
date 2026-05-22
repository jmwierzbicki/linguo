#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { copyToClipboard } from './lib/clipboard';
import { DEFAULT_CONFIG, findConfigFile, parseConfig, type LinguoConfig } from './lib/config';
import { buildTranslationPrompt, resolveTargetLocale } from './lib/prompt';
import { compileCatalogs, extractToCatalogs, type ExtractStats } from './lib/runner';
import { runInteractive } from './interactive';

/** Flags that take a following value (`--name value`), used to skip them when
 * scanning for the positional argument. */
const VALUE_FLAGS = new Set([
  'config',
  'locales',
  'source-locale',
  'src',
  'catalogs',
  'out',
  'po',
  'reference-base',
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

  process.stderr.write(
    [
      'Usage: linguo-extract [command] [options]',
      '',
      'Run with no command in a terminal to open the guided interactive menu.',
      'Reads linguo.config.json (found automatically, or --config <path>); flags override.',
      '',
      '  extract [--config <path>] [--src <dir>] [--out <dir>] [--locales en,pl] [--source-locale en]',
      '          Scan sources and create/update <locale>.po catalogs.',
      '',
      '  compile [--config <path>] [--po <dir>] [--out <dir>]',
      '          Compile <locale>.po catalogs into runtime <locale>.json.',
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
