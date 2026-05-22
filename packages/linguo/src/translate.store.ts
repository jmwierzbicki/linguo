import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';

import { resolveInitialLang } from './lang-resolution';
import { contextKey, normalizeKey } from './normalize';
import type { TranslateConfig, TranslationLoader, Translations } from './types';

/**
 * DI token carrying the {@link TranslateConfig} supplied via `provideTranslate`.
 * Internal: consumers configure the runtime through `provideTranslate`, not by
 * providing this token directly.
 */
export const TRANSLATE_CONFIG = new InjectionToken<TranslateConfig>('ng-linguo.config');

/**
 * DI token carrying the resolved {@link TranslationLoader}. `provideTranslate`
 * registers it from the config's `loader` — either directly (a ready-made
 * loader) or via a factory run inside the injection context (so loaders that
 * inject Angular services, like `createHttpLoader`, can be used). Internal.
 */
export const TRANSLATION_LOADER = new InjectionToken<TranslationLoader>('ng-linguo.loader');

interface TranslateState {
  readonly currentLang: string;
  readonly isReady: boolean;
  readonly translations: Translations;
}

const initialState: TranslateState = {
  currentLang: '',
  isReady: false,
  translations: {},
};

/**
 * The reactive translation runtime, implemented as an `@ngrx/signals`
 * `signalStore`. Consumers inject it and read state through signals; there are
 * no `Observable` getters on the public surface.
 *
 * State is not loaded implicitly. Call {@link TranslateStore.restoreLang} once
 * at startup to pick the language (persisted → browser → default) and load it,
 * or {@link TranslateStore.setLang} to switch to a specific one.
 * {@link TranslateStore.isReady} stays `false` until a language has loaded, so
 * UI can gate on it to avoid a flash of untranslated content.
 *
 * @example
 * ```ts
 * const store = inject(TranslateStore);
 * store.currentLang(); // Signal<string>
 * store.isReady();     // Signal<boolean>
 * await store.restoreLang(); // startup: persisted ?? browser ?? default
 * await store.setLang('pl'); // explicit switch
 * store.translate('greeting');
 * ```
 */
export const TranslateStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const config = inject(TRANSLATE_CONFIG);
    const loader = inject(TRANSLATION_LOADER);
    // `defaultView` is the Window in a browser, and null under SSR — so all
    // localStorage/navigator access below is automatically a no-op on the server.
    const win = inject(DOCUMENT).defaultView;
    const persistEnabled = config.persistSelectedLanguage ?? true;
    const detectEnabled = config.detectBrowserLanguage ?? true;
    const persistKey = config.persistKey ?? 'ng-linguo.lang';

    function readPersisted(): string | null {
      if (!persistEnabled || !win) return null;
      try {
        return win.localStorage.getItem(persistKey);
      } catch {
        return null; // storage disabled (private mode, blocked cookies, …)
      }
    }
    function writePersisted(lang: string): void {
      if (!persistEnabled || !win) return;
      try {
        win.localStorage.setItem(persistKey, lang);
      } catch {
        // ignore — persistence is best-effort
      }
    }
    function browserLangs(): readonly string[] {
      const nav = win?.navigator;
      if (!detectEnabled || !nav) return [];
      return nav.languages?.length ? nav.languages : nav.language ? [nav.language] : [];
    }

    async function load(lang: string): Promise<void> {
      const translations = await loader.load(lang);
      patchState(store, { currentLang: lang, translations, isReady: true });
      writePersisted(lang);
    }

    return {
      /**
       * Load the translations for `lang`, make them current, and (when
       * `persistSelectedLanguage` is on) persist the choice. Resolves once the
       * loader has returned and the store is ready.
       */
      setLang(lang: string): Promise<void> {
        return load(lang);
      },
      /**
       * Resolve the startup language — **persisted → browser-preferred →
       * `defaultLang`** — and load it. Call this once at startup instead of
       * `setLang(defaultLang)`. Persistence and browser detection are on by
       * default and can be turned off via `provideTranslate` config; both are
       * SSR-safe (they fall through to the default on the server).
       */
      restoreLang(): Promise<void> {
        return load(
          resolveInitialLang({
            persisted: readPersisted(),
            browserLangs: browserLangs(),
            supportedLangs: config.supportedLangs,
            defaultLang: config.defaultLang,
          }),
        );
      },
      /**
       * Resolve a translation key against the currently loaded language.
       *
       * An optional `context` disambiguates keys that share the same source
       * text (for example `Play` in a game versus a music player). Lookup tries
       * the contextual key first, then falls back to the plain key, then to the
       * key itself — so a missing translation is visible rather than blank, and
       * omitting the context always resolves to the default entry.
       */
      translate(key: string, context?: string): string {
        const normalized = normalizeKey(key);
        const translations = store.translations();
        if (context !== undefined && context.trim() !== '') {
          const contextual = translations[contextKey(key, context)];
          if (contextual !== undefined) {
            return contextual;
          }
        }
        return translations[normalized] ?? normalized;
      },
    };
  }),
  withHooks({
    onInit(store): void {
      // Report the configured default language immediately, without loading.
      patchState(store, { currentLang: inject(TRANSLATE_CONFIG).defaultLang });
    },
  }),
);
