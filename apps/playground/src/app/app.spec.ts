import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslate } from '@ng-linguo/linguo';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        provideTranslate({
          defaultLang: 'en',
          loader: { load: () => Promise.resolve({}) },
        }),
      ],
    }).compileComponents();
  });

  it('renders the hero heading', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Angular i18n');
  });

  it('marks the configured default language as active in the switcher', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const active = compiled.querySelector('button.bg-indigo-500');
    expect(active?.textContent).toContain('English');
  });
});
