import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Placeholder replaced with the human-readable target language label. */
const LANGUAGE_SLOT = '{{TARGET_LANGUAGE}}';
/** Placeholder replaced with the full `.po` catalog contents. */
const PO_SLOT = '{{PO_FILE}}';

/**
 * The translation prompt template, shipped as a sibling `.txt` asset so the
 * long instructions stay readable (and editable) without escaping. Read once
 * and cached for the process.
 */
let cachedTemplate: string | undefined;

function loadTemplate(): string {
  if (cachedTemplate === undefined) {
    cachedTemplate = readFileSync(join(__dirname, 'translation-prompt.txt'), 'utf8');
  }
  return cachedTemplate;
}

/**
 * Build a single, self-contained prompt that instructs an LLM to translate a
 * whole `.po` catalog. The template explains ng-linguo's concepts (context,
 * slot tags, MessageFormat 2 plurals/selection) and is filled with the target
 * language label and the catalog contents.
 *
 * @param targetLanguage human-readable label for the language to translate
 *   into, e.g. `"Polish (pl)"`.
 * @param poContents the entire `.po` file to translate.
 * @returns the ready-to-send prompt.
 */
export function buildTranslationPrompt(targetLanguage: string, poContents: string): string {
  return loadTemplate().split(LANGUAGE_SLOT).join(targetLanguage).split(PO_SLOT).join(poContents);
}

/** A configured locale matched from user input, with a label for the prompt. */
export interface ResolvedLocale {
  /** The locale code whose `<locale>.po` catalog should be translated. */
  readonly locale: string;
  /** Human-readable label injected into the prompt, e.g. `"Polish (pl)"`. */
  readonly label: string;
}

function displayName(locale: string, inLocale: string): string | undefined {
  try {
    return new Intl.DisplayNames([inLocale], { type: 'language' }).of(locale);
  } catch {
    // Unknown locale or no ICU data — fall back to code-only matching.
    return undefined;
  }
}

/**
 * A human-readable label for a locale, e.g. `"Polish (pl)"`, used in prompts
 * and menus. Falls back to the bare code when no display name is available.
 */
export function localeLabel(locale: string): string {
  const english = displayName(locale, 'en');
  return english ? `${english} (${locale})` : locale;
}

/**
 * Resolve a user-supplied language to one of the configured locales. The input
 * may be the locale code (`pl`), the English name (`Polish`), or the endonym —
 * the language's own name (`Polski`) — all matched case-insensitively.
 *
 * @returns the matched locale and a `"<English name> (<code>)"` label, or
 *   `undefined` when nothing matches.
 */
export function resolveTargetLocale(
  input: string,
  locales: readonly string[],
): ResolvedLocale | undefined {
  const needle = input.trim().toLowerCase();
  if (needle === '') {
    return undefined;
  }

  for (const locale of locales) {
    const english = displayName(locale, 'en');
    const endonym = displayName(locale, locale);
    const matches =
      locale.toLowerCase() === needle ||
      english?.toLowerCase() === needle ||
      endonym?.toLowerCase() === needle;

    if (matches) {
      return { locale, label: localeLabel(locale) };
    }
  }

  return undefined;
}
