/**
 * A flat map of translation keys to their resolved string values for a single
 * language. Values are plain strings (optionally containing `[name]...[/name]`
 * slot tags and ICU syntax) — never HTML. This is the on-disk JSON shape, kept
 * stable since v1 so translators can keep using existing tooling.
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
  /**
   * How translations are fetched. Either a ready-made {@link TranslationLoader}
   * (e.g. a static dictionary or a `fetch`-based loader), or a **factory** that
   * returns one. The factory runs inside Angular's injection context, so use it
   * for loaders that inject Angular services — such as `createHttpLoader()` from
   * `@ng-linguo/linguo/http`, which needs `HttpClient`:
   *
   * ```ts
   * provideTranslate({ defaultLang: 'en', loader: () => createHttpLoader() });
   * ```
   */
  readonly loader: TranslationLoader | (() => TranslationLoader);
  /**
   * Languages the app ships. Used by {@link TranslateStore.restoreLang} to match
   * a persisted or browser-preferred value to one that actually exists. Browser
   * matching is skipped when this is omitted (so an unshipped language is never
   * auto-selected).
   */
  readonly supportedLangs?: readonly string[];
  /**
   * Write the active language to `localStorage` whenever it changes (the
   * **persist** side). Defaults to `true`. SSR-safe (a no-op when not running
   * in a browser). To stop reading the saved value on startup as well, see
   * {@link restoreSelectedLanguage}.
   */
  readonly persistSelectedLanguage?: boolean;
  /**
   * Read the persisted language back on startup, inside
   * {@link TranslateStore.restoreLang} (the **restore** side). Decoupled from
   * {@link persistSelectedLanguage} so an app can keep persisting while owning
   * the restore decision itself — set this to `false` and run your own
   * selection logic, or just call `setLang(...)` instead of `restoreLang()`.
   *
   * Defaults to `persistSelectedLanguage` (so disabling persistence alone still
   * disables restore, as before); set it explicitly to override. SSR-safe.
   */
  readonly restoreSelectedLanguage?: boolean;
  /** `localStorage` key for the persisted language. Defaults to `ng-linguo.lang`. */
  readonly persistKey?: string;
  /**
   * On first run (nothing persisted), use the browser's preferred language
   * (`navigator.languages`) matched against {@link supportedLangs}. Defaults to
   * `true`. SSR-safe.
   */
  readonly detectBrowserLanguage?: boolean;
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
