import { existsSync, readdirSync, type Dirent } from 'node:fs';
import { dirname, join } from 'node:path';

/** The conventional config file name discovered when `--config` is omitted. */
export const CONFIG_FILENAME = 'linguo.config.json';

/** Directories never descended into during the downward config search. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'coverage', 'tmp']);

function findUpward(startDir: string): string | undefined {
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, CONFIG_FILENAME);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

function findDownward(startDir: string, maxDepth: number): string[] {
  const found: string[] = [];
  const walk = (dir: string, depth: number): void => {
    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory — skip it
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (depth >= maxDepth || entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) {
          continue;
        }
        walk(join(dir, entry.name), depth + 1);
      } else if (entry.name === CONFIG_FILENAME) {
        found.push(join(dir, entry.name));
      }
    }
  };
  walk(startDir, 0);
  return found;
}

/**
 * Locate a `linguo.config.json` when no explicit `--config` was given. Searches
 * upward from `startDir` first — so running anywhere inside a project finds its
 * root config — then downward through the workspace, so running from a monorepo
 * root still finds a single project config without a flag.
 *
 * @returns the resolved path, or `undefined` when none is found.
 * @throws when the downward search finds more than one config (ambiguous —
 *   the caller should pass `--config`).
 */
export function findConfigFile(startDir: string): string | undefined {
  const upward = findUpward(startDir);
  if (upward !== undefined) {
    return upward;
  }

  const downward = findDownward(startDir, 6);
  if (downward.length > 1) {
    throw new Error(
      `linguo config: found ${downward.length} ${CONFIG_FILENAME} files ` +
        `(${downward.join(', ')}). Pass --config <path> to choose one.`,
    );
  }
  return downward[0];
}

/**
 * Consumer-facing configuration for the `linguo-extract` tooling, typically
 * stored as `linguo.config.json` at the project root. Paths are resolved
 * relative to the config file's directory.
 *
 * @example
 * ```json
 * {
 *   "locales": ["en", "pl", "de"],
 *   "sourceLocale": "en",
 *   "src": "src",
 *   "catalogs": "i18n",
 *   "output": "src/assets/i18n"
 * }
 * ```
 */
export interface LinguoConfig {
  /** Languages to generate catalogs for. Required and non-empty. */
  readonly locales: readonly string[];
  /** Language whose entries hold the source text (no missing flag). Default `en`. */
  readonly sourceLocale: string;
  /** Directory scanned for translatable strings. Default `src`. */
  readonly src: string;
  /** Directory holding the `<locale>.po` catalogs. Default `i18n`. */
  readonly catalogs: string;
  /** Directory for the compiled runtime `<locale>.json`. Default `src/assets/i18n`. */
  readonly output: string;
  /**
   * Base for `#:` source references in the `.po` files:
   * - `'config'` — relative to this config file's directory (gettext-style,
   *   portable; the default).
   * - `'workspace'` — relative to where the CLI is run (typically the workspace
   *   root), so paths resolve for terminal Ctrl+Click and editor tooling.
   */
  readonly referenceBase: 'config' | 'workspace';
}

/** Defaults applied for any field a config file omits (except `locales`). */
export const DEFAULT_CONFIG: Omit<LinguoConfig, 'locales'> = {
  sourceLocale: 'en',
  src: 'src',
  catalogs: 'i18n',
  output: 'src/assets/i18n',
  referenceBase: 'config',
};

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

/**
 * Parse and validate a `linguo.config.json` document, applying defaults. Throws
 * a descriptive error when the JSON is invalid or `locales` is missing/empty.
 */
export function parseConfig(raw: string): LinguoConfig {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('linguo config: file is not valid JSON');
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('linguo config: expected a JSON object');
  }

  const record = data as Record<string, unknown>;
  const rawLocales = record['locales'];
  if (!Array.isArray(rawLocales) || rawLocales.length === 0) {
    throw new Error('linguo config: "locales" must be a non-empty array of language codes');
  }
  const locales: string[] = [];
  for (const locale of rawLocales) {
    if (typeof locale !== 'string') {
      throw new Error('linguo config: every entry in "locales" must be a string');
    }
    locales.push(locale);
  }

  const referenceBase = record['referenceBase'];
  if (referenceBase !== undefined && referenceBase !== 'config' && referenceBase !== 'workspace') {
    throw new Error('linguo config: "referenceBase" must be "config" or "workspace"');
  }

  return {
    locales,
    sourceLocale: asString(record['sourceLocale'], DEFAULT_CONFIG.sourceLocale),
    src: asString(record['src'], DEFAULT_CONFIG.src),
    catalogs: asString(record['catalogs'], DEFAULT_CONFIG.catalogs),
    output: asString(record['output'], DEFAULT_CONFIG.output),
    referenceBase: referenceBase === 'workspace' ? 'workspace' : DEFAULT_CONFIG.referenceBase,
  };
}

/**
 * Serialize a {@link LinguoConfig} to pretty-printed `linguo.config.json` text
 * (stable field order, trailing newline). Round-trips with {@link parseConfig}.
 */
export function serializeConfig(config: LinguoConfig): string {
  const ordered = {
    locales: config.locales,
    sourceLocale: config.sourceLocale,
    src: config.src,
    catalogs: config.catalogs,
    output: config.output,
    referenceBase: config.referenceBase,
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}
