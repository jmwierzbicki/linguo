import { pathToFileURL } from 'node:url';

import { applyTranslations, isUntranslated } from './apply';
import { parsePo, serializePo } from './po';
import { buildTranslationPrompt } from './prompt';

/**
 * What a consumer's translate function receives. We build the prompt (explaining
 * ng-linguo's context, slot tags and MessageFormat 2 rules) and parse the reply;
 * the function's only job is to send `prompt` to an AI provider and return the
 * model's raw answer — a complete `.po` block. This keeps every provider SDK and
 * API secret on the consumer's side, out of this build-time tool.
 */
export interface TranslateRequest {
  /** The ready-to-send prompt for the untranslated entries of one catalog. */
  readonly prompt: string;
  /** The catalog's locale code, e.g. `"pl"`. */
  readonly targetLocale: string;
  /** A human-readable label for the locale, e.g. `"Polish (pl)"`. */
  readonly targetLabel: string;
  /** The configured source locale the strings are translated from, e.g. `"en"`. */
  readonly sourceLocale: string;
}

/**
 * A consumer-supplied translation function. Linked to the build via the
 * `translator` field in `linguo.config.json` (a path to a module that exports it
 * as `translate` or as the default export). It receives a {@link TranslateRequest}
 * and returns the model's reply — the translated `.po` text — sync or async.
 *
 * @example
 * ```js
 * // linguo.translator.mjs
 * import OpenAI from 'openai';
 * const client = new OpenAI(); // reads OPENAI_API_KEY
 *
 * export async function translate({ prompt }) {
 *   const res = await client.chat.completions.create({
 *     model: 'gpt-4o',
 *     messages: [{ role: 'user', content: prompt }],
 *   });
 *   return res.choices[0].message.content ?? '';
 * }
 * ```
 */
export type TranslateFunction = (request: TranslateRequest) => string | Promise<string>;

function pickExport(mod: unknown): unknown {
  if (typeof mod !== 'object' || mod === null) {
    return undefined;
  }
  const record = mod as Record<string, unknown>;
  if (typeof record['translate'] === 'function') {
    return record['translate'];
  }
  const def = record['default'];
  if (typeof def === 'function') {
    return def;
  }
  // An ESM module whose default export is itself an object with `translate`.
  if (typeof def === 'object' && def !== null) {
    const defRecord = def as Record<string, unknown>;
    if (typeof defRecord['translate'] === 'function') {
      return defRecord['translate'];
    }
  }
  return undefined;
}

/**
 * Extract the {@link TranslateFunction} from an imported translator module,
 * accepting either a named `translate` export or a default function. Pure (no
 * I/O), so it is unit-tested directly.
 *
 * @throws when no usable function is exported.
 */
export function resolveTranslatorExport(
  mod: unknown,
  source = 'translator module',
): TranslateFunction {
  const candidate = pickExport(mod);
  if (typeof candidate !== 'function') {
    throw new Error(
      `${source} must export a "translate" function (named export) or a default function.`,
    );
  }
  return candidate as TranslateFunction;
}

/** How a module specifier is loaded; injectable so the loader is testable. */
export type ModuleImporter = (specifier: string) => Promise<unknown>;

/**
 * Dynamically import the translator module at `resolvedPath` (an absolute path)
 * and return its {@link TranslateFunction}. The path is converted to a `file://`
 * URL so ESM `.mjs`/`.js` consumer modules load on every platform.
 *
 * @throws when the module cannot be loaded or exports no usable function.
 */
export async function loadTranslator(
  resolvedPath: string,
  importer: ModuleImporter = (specifier) => import(specifier),
): Promise<TranslateFunction> {
  const href = pathToFileURL(resolvedPath).href;
  let mod: unknown;
  try {
    mod = await importer(href);
  } catch (error) {
    throw new Error(
      `could not load translator module at ${resolvedPath}: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return resolveTranslatorExport(mod, resolvedPath);
}

/** Outcome of {@link autoTranslateCatalog}. */
export interface AutoTranslateOutcome {
  /** How many entries were sent to the translator (the untranslated ones). */
  readonly untranslated: number;
  /** How many entries received a usable new translation. */
  readonly applied: number;
  /** How many entries are still untranslated after merging the reply. */
  readonly remaining: number;
  /** The merged full catalog as `.po` text (unchanged when nothing applied). */
  readonly po: string;
}

/**
 * Translate one catalog's untranslated entries by calling a {@link TranslateFunction}.
 * Builds the prompt from the missing entries only, invokes `translate`, and folds
 * the reply back into the full catalog. Pure of file I/O — the caller reads and
 * writes the `.po` — so it is unit-tested with a fake translate function.
 *
 * @throws when the translator returns an empty reply.
 */
export async function autoTranslateCatalog(args: {
  readonly translate: TranslateFunction;
  readonly poText: string;
  readonly targetLocale: string;
  readonly targetLabel: string;
  readonly sourceLocale: string;
}): Promise<AutoTranslateOutcome> {
  const untranslated = parsePo(args.poText).filter((e) => isUntranslated(e.msgstr));
  if (untranslated.length === 0) {
    return { untranslated: 0, applied: 0, remaining: 0, po: args.poText };
  }

  const prompt = buildTranslationPrompt(args.targetLabel, serializePo(untranslated));
  const reply = await args.translate({
    prompt,
    targetLocale: args.targetLocale,
    targetLabel: args.targetLabel,
    sourceLocale: args.sourceLocale,
  });
  if (typeof reply !== 'string' || reply.trim() === '') {
    throw new Error(`translator returned an empty reply for ${args.targetLabel}`);
  }

  const { po, applied } = applyTranslations(args.poText, reply);
  const remaining = parsePo(po).filter((e) => isUntranslated(e.msgstr)).length;
  return { untranslated: untranslated.length, applied, remaining, po };
}
