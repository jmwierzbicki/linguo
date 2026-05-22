import { computed } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MESSAGE_FORMATTER } from './message-formatter';
import { provideTranslate } from './provide-translate';
import { injectTranslate, type TranslateFn } from './translate-fn';
import { TranslateStore } from './translate.store';
import type { Translations } from './types';

const catalog: Record<string, Translations> = {
  en: { Play: 'Play', 'Hi {name}': 'Hi {name}' },
  pl: { Play: 'Odtwarzaj' },
};

function setup(extraProviders: unknown[] = []) {
  TestBed.configureTestingModule({
    providers: [
      provideTranslate({
        defaultLang: 'en',
        loader: { load: (lang) => Promise.resolve(catalog[lang] ?? {}) },
      }),
      ...(extraProviders as never[]),
    ],
  });
  const store = TestBed.inject(TranslateStore);
  const t: TranslateFn = TestBed.runInInjectionContext(() => injectTranslate());
  return { store, t };
}

describe('injectTranslate', () => {
  it('translates against the current language', async () => {
    const { store, t } = setup();
    await store.setLang('en');
    expect(t('Play')).toBe('Play');
    await store.setLang('pl');
    expect(t('Play')).toBe('Odtwarzaj');
  });

  it('formats params via the injected formatter', async () => {
    const { store, t } = setup([
      {
        provide: MESSAGE_FORMATTER,
        useValue: {
          format: (message: string, args: Record<string, unknown>) =>
            message.replace(/\{(\w+)\}/g, (_m, name: string) => String(args[name])),
        },
      },
    ]);
    await store.setLang('en');
    expect(t('Hi {name}', { params: { name: 'Ada' } })).toBe('Hi Ada');
  });

  it('flattens BBCode placeholders to their inner text', async () => {
    const { store, t } = setup();
    await store.setLang('en');
    expect(t('Read the [docs]documentation[/docs] now')).toBe('Read the documentation now');
  });

  it('is reactive when read inside a computed', async () => {
    const { store, t } = setup();
    const greeting = computed(() => t('Play'));
    await store.setLang('en');
    expect(greeting()).toBe('Play');
    await store.setLang('pl');
    expect(greeting()).toBe('Odtwarzaj');
  });
});
