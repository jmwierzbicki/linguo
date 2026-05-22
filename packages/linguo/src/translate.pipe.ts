import { Pipe, type PipeTransform } from '@angular/core';

import { injectTranslate, type TranslateFn } from './translate-fn';
import type { TranslateOptions } from './types';

/**
 * Resolve a translation key to its string for the current language, with options
 * passed as a single object: ICU `params` and a disambiguating `context`.
 *
 * @example
 * ```html
 * {{ 'Play' | t }}
 * {{ 'Play' | t: { context: 'game' } }}
 * {{ 'Hello {$name}!' | t: { params: { name } } }}
 * ```
 *
 * The key is the source text; a missing key renders as itself. ICU `params` are
 * applied by the formatter from `@ng-linguo/icu` (`provideIcu`); without it the
 * message is returned unformatted.
 *
 * Impure so it re-evaluates against the store's signals on each change
 * detection, re-rendering when the language changes.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly t: TranslateFn = injectTranslate();

  transform(key: string, options?: TranslateOptions): string {
    return this.t(key, options);
  }
}
