import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import type { TranslationLoader, Translations } from '@ng-linguo/linguo';
import { firstValueFrom } from 'rxjs';

/**
 * Options controlling where {@link createHttpLoader} fetches translation files
 * from. Files are expected to live at `${prefix}${lang}${suffix}` and contain a
 * flat JSON map of keys to strings.
 */
export interface HttpLoaderOptions {
  /** Path prefix for translation files. Defaults to `/assets/i18n/`. */
  readonly prefix?: string;
  /** File extension for translation files. Defaults to `.json`. */
  readonly suffix?: string;
}

/**
 * Create a {@link TranslationLoader} backed by Angular's `HttpClient`.
 *
 * Must be called within an injection context (it injects `HttpClient`), so
 * construct it inside a factory provider or an `inject`-aware bootstrap path
 * where `provideHttpClient()` is also available. RxJS is used only here, at the
 * I/O boundary, and is converted to the promise the loader interface expects.
 *
 * @example
 * ```ts
 * const loader = createHttpLoader({ prefix: '/i18n/' });
 * ```
 */
export function createHttpLoader(options: HttpLoaderOptions = {}): TranslationLoader {
  const http = inject(HttpClient);
  const prefix = options.prefix ?? '/assets/i18n/';
  const suffix = options.suffix ?? '.json';
  return {
    load: (lang: string): Promise<Translations> =>
      firstValueFrom(http.get<Translations>(`${prefix}${lang}${suffix}`)),
  };
}
