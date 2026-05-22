import { InjectionToken, inject } from '@angular/core';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';

import { contextKey, normalizeKey } from './normalize';
import type { TranslateConfig, Translations } from './types';

/**
 * DI token carrying the {@link TranslateConfig} supplied via `provideTranslate`.
 * Internal: consumers configure the runtime through `provideTranslate`, not by
 * providing this token directly.
 */
export const TRANSLATE_CONFIG = new InjectionToken<TranslateConfig>('ng-linguo.config');

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
 * State is not loaded implicitly — call {@link TranslateStore.setLang} (or a
 * higher-level bootstrap) to trigger the first load. {@link TranslateStore.isReady}
 * stays `false` until a language has loaded, so UI can gate on it to avoid a
 * flash of untranslated content.
 *
 * @example
 * ```ts
 * const store = inject(TranslateStore);
 * store.currentLang(); // Signal<string>
 * store.isReady();     // Signal<boolean>
 * await store.setLang('pl');
 * store.translate('greeting');
 * ```
 */
export const TranslateStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => {
    const config = inject(TRANSLATE_CONFIG);
    return {
      /**
       * Load the translations for `lang` and make them current. Resolves once
       * the loader has returned and the store is ready.
       */
      async setLang(lang: string): Promise<void> {
        const translations = await config.loader.load(lang);
        patchState(store, { currentLang: lang, translations, isReady: true });
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
