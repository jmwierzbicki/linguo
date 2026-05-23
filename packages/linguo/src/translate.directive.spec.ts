import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { MESSAGE_FORMATTER } from './message-formatter';
import { provideTranslate } from './provide-translate';
import { TranslateDirective, TranslateSlot } from './translate.directive';
import { TranslateStore } from './translate.store';
import type { Translations } from './types';

const SOURCE = 'Read the [docs]documentation[/docs] now';

@Component({
  template: `
    <p t="Read the [docs]documentation[/docs] now">
      <ng-template tFor="docs" let-text>
        <a class="lnk">{{ text }}</a>
      </ng-template>
    </p>
  `,
  imports: [TranslateDirective, TranslateSlot],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {}

const catalog: Record<string, Translations> = {
  en: { [SOURCE]: SOURCE },
  pl: { [SOURCE]: 'Przeczytaj [docs]dokumentację[/docs] teraz' },
};

function setup(loader = { load: (lang: string) => Promise.resolve(catalog[lang] ?? {}) }) {
  TestBed.configureTestingModule({
    imports: [HostComponent],
    providers: [provideTranslate({ defaultLang: 'en', loader })],
  });
  const fixture = TestBed.createComponent(HostComponent);
  const store = TestBed.inject(TranslateStore);
  return { fixture, store };
}

describe('TranslateDirective', () => {
  it('renders the message text and the slot content in order', async () => {
    const { fixture, store } = setup();
    await store.setLang('en');
    fixture.detectChanges();
    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.textContent?.replace(/\s+/g, ' ').trim()).toBe('Read the documentation now');
  });

  it('binds the slot inner text to the matching tFor template', async () => {
    const { fixture, store } = setup();
    await store.setLang('en');
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a.lnk') as HTMLElement;
    expect(link.textContent).toBe('documentation');
  });

  it('renders translator text as text nodes, never as HTML', async () => {
    const { fixture, store } = setup({
      load: () => Promise.resolve({ [SOURCE]: '<img src=x>[docs]x[/docs]' }),
    });
    await store.setLang('en');
    fixture.detectChanges();
    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.querySelector('img')).toBeNull();
    expect(p.textContent).toContain('<img src=x>');
  });

  it('re-renders when the language changes', async () => {
    const { fixture, store } = setup();
    await store.setLang('en');
    fixture.detectChanges();

    await store.setLang('pl');
    fixture.detectChanges();
    const p = fixture.nativeElement.querySelector('p') as HTMLElement;
    expect(p.textContent).toContain('dokumentację');
  });
});

@Component({
  template: `<p t="Hi {name}!" [tParams]="{ name: 'Ada' }"></p>`,
  imports: [TranslateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class IcuHostComponent {}

describe('TranslateDirective ICU params', () => {
  it('formats tParams via the message formatter', async () => {
    TestBed.configureTestingModule({
      imports: [IcuHostComponent],
      providers: [
        provideTranslate({ defaultLang: 'en', loader: { load: () => Promise.resolve({}) } }),
        {
          provide: MESSAGE_FORMATTER,
          useValue: {
            format: (message: string, args: Record<string, unknown>) =>
              message.replace(/\{(\w+)\}/g, (_m, name: string) => String(args[name])),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(IcuHostComponent);
    const store = TestBed.inject(TranslateStore);
    await store.setLang('en');
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('p') as HTMLElement).textContent?.trim()).toBe(
      'Hi Ada!',
    );
  });
});
