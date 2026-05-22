import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MESSAGE_FORMATTER, type MessageFormatter } from './message-formatter';
import { provideTranslate } from './provide-translate';
import { TranslatePipe } from './translate.pipe';
import { TranslateStore } from './translate.store';
import type { TranslateOptions, Translations } from './types';

const GLUE = String.fromCharCode(4);

@Component({
  template: `{{ key() | t: options() }}`,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {
  readonly key = signal('Play');
  readonly options = signal<TranslateOptions | undefined>(undefined);
}

const catalog: Record<string, Translations> = {
  en: { Play: 'Play', 'Hi {name}': 'Hi {name}', [`game${GLUE}Play`]: 'Start' },
  pl: { Play: 'Odtwarzaj' },
};

// Trivial formatter that substitutes `{arg}` placeholders.
const fakeFormatter: MessageFormatter = {
  format: (message, args) =>
    message.replace(/\{(\w+)\}/g, (_match, name: string) => String(args[name])),
};

function setup(extraProviders: unknown[] = []) {
  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [
      provideTranslate({
        defaultLang: 'en',
        loader: { load: (lang) => Promise.resolve(catalog[lang] ?? {}) },
      }),
      ...(extraProviders as never[]),
    ],
  });
  const fixture = TestBed.createComponent(HostComponent);
  const store = TestBed.inject(TranslateStore);
  return { fixture, store, host: fixture.componentInstance };
}

describe('TranslatePipe', () => {
  it('renders the translation for the current language', async () => {
    const { fixture, store } = setup();
    await store.setLang('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Play');
  });

  it('re-renders when the language changes', async () => {
    const { fixture, store } = setup();
    await store.setLang('en');
    fixture.detectChanges();

    await store.setLang('pl');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Odtwarzaj');
  });

  it('resolves a contextual entry via options.context', async () => {
    const { fixture, store, host } = setup();
    host.options.set({ context: 'game' });
    await store.setLang('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Start');
  });

  it('formats options.params via the injected formatter', async () => {
    const { fixture, store, host } = setup([
      { provide: MESSAGE_FORMATTER, useValue: fakeFormatter },
    ]);
    host.key.set('Hi {name}');
    host.options.set({ params: { name: 'Ada' } });
    await store.setLang('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Hi Ada');
  });

  it('returns the message unformatted when no formatter is provided', async () => {
    const { fixture, store, host } = setup();
    host.key.set('Hi {name}');
    host.options.set({ params: { name: 'Ada' } });
    await store.setLang('en');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('Hi {name}');
  });
});

describe('TranslatePipe — memoization', () => {
  async function pipeWithSpy() {
    setup();
    const store = TestBed.inject(TranslateStore);
    await store.setLang('en');
    const pipe = TestBed.runInInjectionContext(() => new TranslatePipe());
    const lookups = jest.spyOn(store, 'translate');
    return { store, pipe, lookups };
  }

  it('does not re-translate when key, params, and language are unchanged', async () => {
    const { pipe, lookups } = await pipeWithSpy();
    pipe.transform('Play');
    pipe.transform('Play');
    pipe.transform('Play');
    expect(lookups).toHaveBeenCalledTimes(1);
  });

  it('treats a fresh params object with equal contents as a cache hit', async () => {
    const { pipe, lookups } = await pipeWithSpy();
    pipe.transform('Hi {name}', { params: { name: 'Ada' } });
    pipe.transform('Hi {name}', { params: { name: 'Ada' } }); // new object, same content
    expect(lookups).toHaveBeenCalledTimes(1);
  });

  it('re-translates when the params content changes', async () => {
    const { pipe, lookups } = await pipeWithSpy();
    pipe.transform('Hi {name}', { params: { name: 'Ada' } });
    pipe.transform('Hi {name}', { params: { name: 'Bo' } });
    expect(lookups).toHaveBeenCalledTimes(2);
  });

  it('re-translates after the language changes', async () => {
    const { store, pipe, lookups } = await pipeWithSpy();
    expect(pipe.transform('Play')).toBe('Play');
    await store.setLang('pl');
    expect(pipe.transform('Play')).toBe('Odtwarzaj');
    expect(lookups).toHaveBeenCalledTimes(2);
  });
});
