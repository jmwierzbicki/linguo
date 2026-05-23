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
    // `linguo-extract compile`) as static files from public/i18n. The prefix is
    // relative (no leading slash) so it resolves against the document's
    // `<base href>` — this app is served from a `/linguo/` subpath on GitHub
    // Pages, not the domain root. The factory form lets createHttpLoader inject
    // HttpClient.
    provideTranslate({
      defaultLang: 'en',
      supportedLangs: ['en', 'pl', 'de'], // used to match a persisted/browser language
      // persistSelectedLanguage + detectBrowserLanguage default to true:
      // restoreLang() picks persisted → browser → 'en'.
      loader: () => createHttpLoader({ prefix: 'i18n/' }),
    }),
    provideIcu({ defaultFormat: 'mf2' }),
  ],
};
