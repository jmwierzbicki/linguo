import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideTranslate } from './provide-translate';
import { TranslateDirective, TranslateSlot } from './translate.directive';
import { TranslateSlotOutlet } from './translate-slot-outlet.directive';
import { TranslateStore } from './translate.store';
import type { Translations } from './types';

const SOURCE = 'Agree to our [link]Terms and [b]Conditions[/b][/link]';

@Component({
  template: `
    <p t="Agree to our [link]Terms and [b]Conditions[/b][/link]">
      <ng-template tFor="link" let-kids="children">
        <a class="lnk" href="/terms"><ng-container *tRender="kids"></ng-container></a>
      </ng-template>
      <ng-template tFor="b" let-text>
        <strong class="bold">{{ text }}</strong>
      </ng-template>
    </p>
  `,
  imports: [TranslateDirective, TranslateSlot, TranslateSlotOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class NestedHostComponent {}

// Polish moves the bold word to the front — the nested structure must survive a
// language switch, not just render once.
const catalog: Record<string, Translations> = {
  en: { [SOURCE]: SOURCE },
  pl: { [SOURCE]: 'Zaakceptuj nasz [link][b]Regulamin[/b] i warunki[/link]' },
};

function setup() {
  TestBed.configureTestingModule({
    imports: [NestedHostComponent],
    providers: [
      provideTranslate({
        defaultLang: 'en',
        loader: { load: (lang: string) => Promise.resolve(catalog[lang] ?? {}) },
      }),
    ],
  });
  const fixture = TestBed.createComponent(NestedHostComponent);
  const store = TestBed.inject(TranslateStore);
  return { fixture, store };
}

describe('TranslateSlotOutlet (*tRender)', () => {
  it('binds a nested slot to its own template instead of flattening it to text', async () => {
    const { fixture, store } = setup();
    await store.setLang('en');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.lnk') as HTMLElement;
    const bold = link.querySelector('strong.bold');
    expect(bold).not.toBeNull();
    expect(bold?.textContent).toBe('Conditions');
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe('Terms and Conditions');
  });

  it('keeps the nested binding after a language change that reorders the words', async () => {
    const { fixture, store } = setup();
    await store.setLang('en');
    fixture.detectChanges();

    await store.setLang('pl');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a.lnk') as HTMLElement;
    expect(link.querySelector('strong.bold')?.textContent).toBe('Regulamin');
    expect(link.textContent?.replace(/\s+/g, ' ').trim()).toBe('Regulamin i warunki');
  });

  it('does not leak views: a re-render leaves exactly one nested strong element', async () => {
    const { fixture, store } = setup();
    await store.setLang('en');
    fixture.detectChanges();
    await store.setLang('pl');
    fixture.detectChanges();
    await store.setLang('en');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('strong.bold').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('a.lnk').length).toBe(1);
  });
});
