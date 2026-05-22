import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { compileEntries } from './compile';
import { mergeCatalog } from './merge';
import { parsePo, serializePo, type PoEntry } from './po';
import { extractMessages, type SourceFile } from './scan';

const SCANNED_EXTENSIONS = ['.html', '.ts'] as const;

/**
 * Prefix marking a translation that has not been provided yet. New entries in
 * non-source locales are seeded with this followed by the source text, so the
 * string is visible and obviously flagged in the running app until translated.
 */
export const MISSING_PREFIX = '<MISSING TRANSLATION>';

function walk(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) {
      continue;
    }
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (SCANNED_EXTENSIONS.some((ext) => name.endsWith(ext)) && !name.endsWith('.spec.ts')) {
      files.push(full);
    }
  }
  return files;
}

function identity(entry: Pick<PoEntry, 'context' | 'msgid'>): string {
  return entry.context === ''
    ? entry.msgid
    : `${entry.context}${String.fromCharCode(4)}${entry.msgid}`;
}

function isMissing(msgstr: string): boolean {
  return msgstr === '' || msgstr.startsWith(MISSING_PREFIX);
}

/** Per-language summary of an extraction run. */
export interface LocaleExtractStats {
  readonly locale: string;
  /** Total entries in the catalog after the run. */
  readonly total: number;
  /** Entries newly added this run. */
  readonly added: number;
  /** Entries dropped this run (no longer in the source). */
  readonly removed: number;
  /** Entries still untranslated (empty or `<MISSING TRANSLATION>`-prefixed). */
  readonly missing: number;
}

/** Summary of an extraction run across all locales. */
export interface ExtractStats {
  readonly files: number;
  readonly messages: number;
  readonly locales: readonly LocaleExtractStats[];
}

/** Options for {@link extractToCatalogs}. */
export interface ExtractOptions {
  /** Directory to scan recursively for translatable strings. */
  readonly srcDir: string;
  /** Directory to write `<locale>.po` catalogs into. */
  readonly outDir: string;
  /** Locales to create or update, e.g. `['en', 'pl']`. */
  readonly locales: readonly string[];
  /** Base used to make `#:` references relative. Defaults to `process.cwd()`. */
  readonly cwd?: string;
  /**
   * Locale whose new entries are seeded with the source text itself (the
   * canonical value) instead of a `<MISSING TRANSLATION>` placeholder. Defaults
   * to `'en'`.
   */
  readonly sourceLocale?: string;
}

/**
 * Scan `srcDir`, then create or update one `.po` catalog per locale in
 * `outDir`, merging with any existing catalog so translations are preserved.
 *
 * Newly discovered entries are seeded: the source locale gets the source text,
 * other locales get `"<MISSING TRANSLATION> <source>"` so the string renders
 * visibly flagged until translated. Returns per-language stats.
 */
export function extractToCatalogs(options: ExtractOptions): ExtractStats {
  const base = options.cwd ?? process.cwd();
  const sourceLocale = options.sourceLocale ?? 'en';
  const files: SourceFile[] = walk(options.srcDir).map((path) => ({
    path: relative(base, path).split('\\').join('/'),
    content: readFileSync(path, 'utf8'),
  }));
  const messages = extractMessages(files);

  mkdirSync(options.outDir, { recursive: true });
  const locales: LocaleExtractStats[] = [];

  for (const locale of options.locales) {
    const poPath = join(options.outDir, `${locale}.po`);
    const existing = existsSync(poPath) ? parsePo(readFileSync(poPath, 'utf8')) : [];
    const existingIds = new Set(existing.map(identity));
    const merged = mergeCatalog(existing, messages);

    let added = 0;
    const seeded = merged.map((entry): PoEntry => {
      const isNew = !existingIds.has(identity(entry));
      if (!isNew) {
        return entry;
      }
      added += 1;
      const fallback = locale === sourceLocale ? entry.msgid : `${MISSING_PREFIX} ${entry.msgid}`;
      return entry.msgstr === '' ? { ...entry, msgstr: fallback } : entry;
    });

    writeFileSync(poPath, serializePo(seeded));

    const mergedIds = new Set(seeded.map(identity));
    locales.push({
      locale,
      total: seeded.length,
      added,
      removed: [...existingIds].filter((id) => !mergedIds.has(id)).length,
      missing: seeded.filter((entry) => isMissing(entry.msgstr)).length,
    });
  }

  return { files: files.length, messages: messages.length, locales };
}

/** Options for {@link compileCatalogs}. */
export interface CompileOptions {
  /** Directory containing `<locale>.po` catalogs. */
  readonly poDir: string;
  /** Directory to write `<locale>.json` runtime dictionaries into. */
  readonly outDir: string;
}

/**
 * Compile every `.po` catalog in `poDir` into a runtime `<locale>.json`
 * dictionary in `outDir` (the format the loader consumes).
 */
export function compileCatalogs(options: CompileOptions): void {
  mkdirSync(options.outDir, { recursive: true });
  for (const name of readdirSync(options.poDir)) {
    if (!name.endsWith('.po')) {
      continue;
    }
    const locale = name.slice(0, -'.po'.length);
    const entries = parsePo(readFileSync(join(options.poDir, name), 'utf8'));
    writeFileSync(
      join(options.outDir, `${locale}.json`),
      `${JSON.stringify(compileEntries(entries), null, 2)}\n`,
    );
  }
}
