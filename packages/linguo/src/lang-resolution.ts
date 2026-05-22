/** Inputs for {@link resolveInitialLang}, gathered by the store (SSR-safe). */
export interface LangResolutionInput {
  /** The persisted language (e.g. from `localStorage`), or `null`/`''` if none
   * — already gated to `null` by the store when persistence is disabled. */
  readonly persisted: string | null;
  /** The browser's preferred languages (`navigator.languages`), most-preferred
   * first — already empty when detection is disabled or off the browser. */
  readonly browserLangs: readonly string[];
  /** The languages the app ships. Required to match a browser/persisted value
   * to one that actually exists; when omitted, browser matching is skipped. */
  readonly supportedLangs: readonly string[] | undefined;
  /** The configured fallback language. */
  readonly defaultLang: string;
}

function isSupported(lang: string, supported: readonly string[] | undefined): boolean {
  return supported === undefined || supported.some((l) => l.toLowerCase() === lang.toLowerCase());
}

/** Match a BCP-47 tag (e.g. `pl-PL`) to a supported language: exact first, then
 * its base subtag (`pl`). Returns the supported language in its original case. */
function matchSupported(tag: string, supported: readonly string[]): string | undefined {
  const lower = tag.toLowerCase();
  const base = lower.split('-')[0] ?? lower;
  return (
    supported.find((l) => l.toLowerCase() === lower) ??
    supported.find((l) => l.toLowerCase() === base)
  );
}

/**
 * Resolve the language to load on startup, in priority order:
 * **persisted → browser-preferred → default**.
 *
 * Pure: the store gathers the (SSR-safe) inputs and passes them in. A persisted
 * value is honored only if it's supported; browser preferences are matched
 * against `supportedLangs` (so an unshipped language is never selected), and if
 * nothing matches the `defaultLang` is used.
 */
export function resolveInitialLang(input: LangResolutionInput): string {
  const { persisted, browserLangs, supportedLangs, defaultLang } = input;

  if (persisted && persisted.trim() !== '' && isSupported(persisted, supportedLangs)) {
    return persisted;
  }

  if (supportedLangs !== undefined) {
    for (const tag of browserLangs) {
      const match = matchSupported(tag, supportedLangs);
      if (match !== undefined) {
        return match;
      }
    }
  }

  return defaultLang;
}
