import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslate } from '@ng-linguo/linguo';
import { createHttpLoader } from '@ng-linguo/linguo/http';
import { provideIcu } from '@ng-linguo/linguo/icu';

import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(),
    // Fetch the runtime dictionaries (compiled from i18n/*.po by
    // `linguo-extract compile`) as static files from public/i18n, served at
    // /i18n/<lang>.json. The factory form lets createHttpLoader inject HttpClient.
    provideTranslate({ defaultLang: 'en', loader: () => createHttpLoader({ prefix: '/i18n/' }) }),
    provideIcu({ defaultFormat: 'mf2' }),
  ],
};
