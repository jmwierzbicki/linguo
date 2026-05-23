import { InjectionToken, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslate } from './provide-translate';
import { TranslateStore } from './translate.store';
import type { TranslationLoader } from './types';

// The context/key separator the runtime and extractor share (gettext EOT glue).
const GLUE = String.fromCharCode(4);

function setup(loader: TranslationLoader, defaultLang = 'en'): InstanceType<typeof TranslateStore> {
  TestBed.configureTestingModule({
    providers: [provideTranslate({ defaultLang, loader })],
  });
  return TestBed.inject(TranslateStore);
}

describe('TranslateStore', () => {
  // setLang now persists to localStorage by default — keep tests isolated.
  afterEach(() => {
    try {
      localStorage.clear();
    } catch {
      /* storage unavailable */
    }
  });

  it('reports the configured default language before anything is loaded', () => {
    const store = setup({ load: () => Promise.resolve({}) }, 'pl');
    expect(store.currentLang()).toBe('pl');
  });

  it('is not ready until a language has been loaded', () => {
    const store = setup({ load: () => Promise.resolve({}) });
    expect(store.isReady()).toBe(false);
  });

  it('becomes ready and current after setLang resolves', async () => {
    const store = setup({ load: () => Promise.resolve({ greeting: 'Hi' }) });
    await store.setLang('en');
    expect(store.isReady()).toBe(true);
    expect(store.currentLang()).toBe('en');
  });

  it('returns the translated value for a known key', async () => {
    const store = setup({ load: () => Promise.resolve({ greeting: 'Hi' }) });
    await store.setLang('en');
    expect(store.translate('greeting')).toBe('Hi');
  });

  it('returns the key itself when the key is missing', async () => {
    const store = setup({ load: () => Promise.resolve({}) });
    await store.setLang('en');
    expect(store.translate('missing')).toBe('missing');
  });

  it('resolves a contextual entry when a context is given', async () => {
    const store = setup({
      load: () =>
        Promise.resolve({
          Play: 'Play',
          [`game${GLUE}Play`]: 'Start',
          [`audio${GLUE}Play`]: 'Listen',
        }),
    });
    await store.setLang('en');
    expect(store.translate('Play', 'game')).toBe('Start');
    expect(store.translate('Play', 'audio')).toBe('Listen');
  });

  it('falls back to the plain key when the context has no entry', async () => {
    const store = setup({ load: () => Promise.resolve({ Play: 'Play' }) });
    await store.setLang('en');
    expect(store.translate('Play', 'game')).toBe('Play');
  });

  it('resolves the plain key when no context is given', async () => {
    const store = setup({
      load: () => Promise.resolve({ Play: 'Play', [`game${GLUE}Play`]: 'Start' }),
    });
    await store.setLang('en');
    expect(store.translate('Play')).toBe('Play');
  });

  it('accepts a loader factory and runs it inside the injection context', async () => {
    // A factory loader can inject DI tokens — the mechanism createHttpLoader
    // relies on (it injects HttpClient).
    const GREETING = new InjectionToken<string>('greeting', { factory: () => 'Hej' });
    TestBed.configureTestingModule({
      providers: [
        provideTranslate({
          defaultLang: 'en',
          loader: (): TranslationLoader => {
            const greeting = inject(GREETING);
            return { load: () => Promise.resolve({ greeting }) };
          },
        }),
      ],
    });
    const store = TestBed.inject(TranslateStore);
    await store.setLang('en');
    expect(store.translate('greeting')).toBe('Hej');
  });
});

describe('TranslateStore — language persistence & restoreLang', () => {
  const KEY = 'ng-linguo.lang';
  const noop: TranslationLoader = { load: (lang) => Promise.resolve({ lang }) };

  afterEach(() => localStorage.clear());

  function configure(config: Parameters<typeof provideTranslate>[0]) {
    TestBed.configureTestingModule({ providers: [provideTranslate(config)] });
    return TestBed.inject(TranslateStore);
  }

  it('persists the active language to localStorage on setLang (default)', async () => {
    const store = configure({ defaultLang: 'en', loader: noop });
    await store.setLang('pl');
    expect(localStorage.getItem(KEY)).toBe('pl');
  });

  it('does not persist when persistSelectedLanguage is false', async () => {
    const store = configure({ defaultLang: 'en', persistSelectedLanguage: false, loader: noop });
    await store.setLang('pl');
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('restoreLang loads the persisted language', async () => {
    localStorage.setItem(KEY, 'de');
    const store = configure({
      defaultLang: 'en',
      supportedLangs: ['en', 'pl', 'de'],
      loader: noop,
    });
    await store.restoreLang();
    expect(store.currentLang()).toBe('de');
  });

  it('restoreLang falls back to the default when nothing is persisted or detected', async () => {
    const store = configure({
      defaultLang: 'en',
      supportedLangs: ['en'],
      detectBrowserLanguage: false,
      loader: noop,
    });
    await store.restoreLang();
    expect(store.currentLang()).toBe('en');
    expect(store.isReady()).toBe(true);
  });

  it('still writes but does not restore when restoreSelectedLanguage is false', async () => {
    localStorage.setItem(KEY, 'de');
    const store = configure({
      defaultLang: 'en',
      supportedLangs: ['en', 'pl', 'de'],
      restoreSelectedLanguage: false,
      detectBrowserLanguage: false,
      loader: noop,
    });
    await store.restoreLang();
    // The persisted 'de' is ignored; falls through to the default.
    expect(store.currentLang()).toBe('en');
    // Persistence (the write side) is untouched.
    await store.setLang('pl');
    expect(localStorage.getItem(KEY)).toBe('pl');
  });

  it('restores even with persistence off when restoreSelectedLanguage is true', async () => {
    localStorage.setItem(KEY, 'de');
    const store = configure({
      defaultLang: 'en',
      supportedLangs: ['en', 'pl', 'de'],
      persistSelectedLanguage: false,
      restoreSelectedLanguage: true,
      loader: noop,
    });
    await store.restoreLang();
    expect(store.currentLang()).toBe('de');
    // Writes stay disabled.
    await store.setLang('pl');
    expect(localStorage.getItem(KEY)).toBe('de');
  });

  it('does not restore when persistSelectedLanguage is false and restore is unset', async () => {
    localStorage.setItem(KEY, 'de');
    const store = configure({
      defaultLang: 'en',
      supportedLangs: ['en', 'pl', 'de'],
      persistSelectedLanguage: false,
      detectBrowserLanguage: false,
      loader: noop,
    });
    await store.restoreLang();
    expect(store.currentLang()).toBe('en');
  });

  it('uses a custom persistKey when configured', async () => {
    const store = configure({ defaultLang: 'en', persistKey: 'my.lang', loader: noop });
    await store.setLang('pl');
    expect(localStorage.getItem('my.lang')).toBe('pl');
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
