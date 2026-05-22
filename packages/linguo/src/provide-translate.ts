import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { TRANSLATE_CONFIG, TRANSLATION_LOADER } from './translate.store';
import type { TranslateConfig } from './types';

/**
 * Register the translation runtime for an application or a feature scope.
 *
 * Add the returned providers to `bootstrapApplication`'s `providers` (or a
 * route's `providers`). This only wires up configuration — it never starts a
 * load, so no HTTP is fired during DI initialization. Trigger the first load
 * explicitly via `TranslateStore.setLang`.
 *
 * The `loader` may be a ready-made loader object, or a factory `() => loader`
 * that is run inside the injection context — use the factory form for loaders
 * that inject Angular services (e.g. `createHttpLoader()`, which needs
 * `HttpClient`).
 *
 * @example
 * ```ts
 * // a static dictionary or fetch-based loader
 * provideTranslate({ defaultLang: 'en', loader: myLoader });
 *
 * // an HttpClient-backed loader (factory form)
 * provideTranslate({ defaultLang: 'en', loader: () => createHttpLoader() });
 * ```
 */
export function provideTranslate(config: TranslateConfig): EnvironmentProviders {
  const { loader } = config;
  return makeEnvironmentProviders([
    { provide: TRANSLATE_CONFIG, useValue: config },
    typeof loader === 'function'
      ? { provide: TRANSLATION_LOADER, useFactory: loader }
      : { provide: TRANSLATION_LOADER, useValue: loader },
  ]);
}
