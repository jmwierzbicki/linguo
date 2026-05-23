import { inject } from '@angular/core';

import { slotsToText } from './slot-parser';
import { MESSAGE_FORMATTER } from './message-formatter';
import { TranslateStore } from './translate.store';
import type { TranslateOptions } from './types';

/**
 * Resolves a key to its translation for the current language, with optional ICU
 * `params` and `context` — the function form of the `t` pipe.
 */
export type TranslateFn = (key: string, options?: TranslateOptions) => string;

/**
 * Obtain a {@link TranslateFn} for use in component code — the TypeScript
 * counterpart of the `t` pipe.
 *
 * Call it in an injection context (a field initializer or constructor); the
 * returned `t` reads the store's signals each time it runs, so it stays reactive
 * when used in a template binding or inside a `computed`.
 *
 * @example
 * ```ts
 * export class Greeting {
 *   private readonly t = injectTranslate();
 *   protected readonly name = signal('Ada');
 *   protected readonly text = computed(() =>
 *     this.t('Hello {$name}!', { params: { name: this.name() } }),
 *   );
 * }
 * ```
 */
export function injectTranslate(): TranslateFn {
  const store = inject(TranslateStore);
  const formatter = inject(MESSAGE_FORMATTER, { optional: true });
  return (key, options) => {
    let message = store.translate(key, options?.context);
    if (options?.params && formatter) {
      message = formatter.format(message, options.params, store.currentLang() || 'en');
    }
    // Returns a string, so slot tags degrade to their inner text; the `[t]`
    // directive renders them into templates instead.
    return slotsToText(message);
  };
}
