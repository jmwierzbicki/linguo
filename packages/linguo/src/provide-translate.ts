import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

import { TRANSLATE_CONFIG } from './translate.store';
import type { TranslateConfig } from './types';

/**
 * Register the translation runtime for an application or a feature scope.
 *
 * Add the returned providers to `bootstrapApplication`'s `providers` (or a
 * route's `providers`). This only wires up configuration — it never starts a
 * load, so no HTTP is fired during DI initialization. Trigger the first load
 * explicitly via `TranslateStore.setLang`.
 *
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideTranslate({ defaultLang: 'en', loader: myLoader })],
 * });
 * ```
 */
export function provideTranslate(config: TranslateConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: TRANSLATE_CONFIG, useValue: config }]);
}
