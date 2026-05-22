import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { runInInjectionContext, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { TranslationLoader } from '@ng-linguo/linguo';

import { createHttpLoader } from './http-loader';

function makeLoader(options?: Parameters<typeof createHttpLoader>[0]): TranslationLoader {
  const injector = TestBed.inject(EnvironmentInjector);
  return runInInjectionContext(injector, () => createHttpLoader(options));
}

describe('createHttpLoader', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the file at the default path for the language', () => {
    const loader = makeLoader();
    const result = loader.load('en');
    const request = http.expectOne('/assets/i18n/en.json');
    request.flush({ greeting: 'Hi' });
    return expect(result).resolves.toEqual({ greeting: 'Hi' });
  });

  it('honours a custom prefix and suffix', () => {
    const loader = makeLoader({ prefix: '/i18n/', suffix: '.lang.json' });
    void loader.load('pl');
    const request = http.expectOne('/i18n/pl.lang.json');
    request.flush({});
  });

  it('returns the compiled dictionary verbatim, preserving BBCode placeholders', () => {
    const loader = makeLoader();
    const result = loader.load('pl');
    http.expectOne('/assets/i18n/pl.json').flush({ 'Hello [b]world[/b]': 'Witaj [b]świecie[/b]' });
    return expect(result).resolves.toEqual({ 'Hello [b]world[/b]': 'Witaj [b]świecie[/b]' });
  });
});
