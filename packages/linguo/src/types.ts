/**
 * A flat map of translation keys to their resolved string values for a single
 * language. Values are plain strings (optionally containing BBCode placeholders
 * and ICU syntax) — never HTML. This is the on-disk JSON shape, kept stable
 * since v1 so translators can keep using existing tooling.
 */
export type Translations = Readonly<Record<string, string>>;

/**
 * Strategy for fetching the {@link Translations} for a given language.
 *
 * Implementations live in their own packages (for example
 * `@ng-linguo/linguo/http`); `@ng-linguo/linguo` only depends on this interface
 * so it never reaches for `fetch`/XHR itself.
 */
export interface TranslationLoader {
  /**
   * Resolve the translations for `lang`. Rejecting the promise signals a load
   * failure to the store; resolving with an empty map is a valid "no
   * translations" result.
   *
   * @param lang BCP-47 language tag, for example `'en'` or `'pl'`.
   */
  load(lang: string): Promise<Translations>;
}

/**
 * Bootstrap configuration for the translation runtime, passed to
 * `provideTranslate`. Loading is never started implicitly from this config —
 * the consumer triggers the first load explicitly.
 */
export interface TranslateConfig {
  /** Language the store reports as current before anything is loaded. */
  readonly defaultLang: string;
  /** Loader used to fetch translations for a language. */
  readonly loader: TranslationLoader;
}

/**
 * Options for the `t` pipe, passed as a single object:
 * `{{ 'Hello {$name}!' | t: { params: { name } } }}`.
 */
export interface TranslateOptions {
  /** ICU arguments, formatted via `@ng-linguo/linguo/icu` when provided. */
  readonly params?: Record<string, unknown>;
  /**
   * Disambiguating/contextual text for keys that share the same source text.
   * It is part of the key (gettext `msgctxt`), so distinct contexts get
   * distinct translations; it may be descriptive ("Button that starts a game").
   */
  readonly context?: string;
}
