import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslate, type TranslationLoader, type Translations } from '@ng-linguo/linguo';
import { provideIcu } from '@ng-linguo/linguo/icu';

import { appRoutes } from './app.routes';
import en from '../assets/i18n/en.json';
import pl from '../assets/i18n/pl.json';
import de from '../assets/i18n/de.json';

/**
 * The runtime dictionaries compiled from `apps/playground/i18n/*.po` by
 * `@ng-linguo/extract` (`linguo-extract compile`). They are imported statically
 * here so the playground runs without a backend; a real app would fetch them
 * with `@ng-linguo/linguo/http`.
 */
const dictionaries: Record<string, Translations> = { en, pl, de };

const demoLoader: TranslationLoader = {
  load: (lang) => Promise.resolve(dictionaries[lang] ?? {}),
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideTranslate({ defaultLang: 'en', loader: demoLoader }),
    provideIcu({ defaultFormat: 'mf2' }),
  ],
};
