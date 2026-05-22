import { Pipe, inject, type PipeTransform } from '@angular/core';

import { injectTranslate, type TranslateFn } from './translate-fn';
import { TranslateStore } from './translate.store';
import type { TranslateOptions, Translations } from './types';

/** Shallow value-equality for `params`: same keys, each value strictly equal. */
function paramsEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
}

interface PipeCache {
  readonly key: string;
  readonly context: string | undefined;
  readonly params: Record<string, unknown> | undefined;
  readonly version: Translations;
  readonly result: string;
}

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
 * applied by the formatter from `@ng-linguo/linguo/icu` (`provideIcu`); without
 * it the message is returned unformatted.
 *
 * Impure so it re-evaluates against the store's signals each change detection,
 * re-rendering when the language changes. To keep that cheap it **memoizes** by
 * value: the lookup/format only re-runs when the key, `context`, `params`
 * contents, or the active language actually change — so a fresh `{ params: … }`
 * literal on every change-detection pass costs only an equality check. For hot
 * or looped bindings, prefer `injectTranslate()` inside a `computed()`, which
 * does zero work per change-detection pass.
 */
@Pipe({ name: 't', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly t: TranslateFn = injectTranslate();
  // The translations signal's value reference changes on every `setLang`, so it
  // doubles as the "language version" for cache invalidation.
  private readonly translations = inject(TranslateStore).translations;
  private cache: PipeCache | undefined;

  transform(key: string, options?: TranslateOptions): string {
    const version = this.translations();
    const context = options?.context;
    const params = options?.params;

    const cached = this.cache;
    if (
      cached !== undefined &&
      cached.key === key &&
      cached.context === context &&
      cached.version === version &&
      paramsEqual(cached.params, params)
    ) {
      return cached.result;
    }

    const result = this.t(key, options);
    this.cache = { key, context, params, version, result };
    return result;
  }
}
