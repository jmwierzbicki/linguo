import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  injectTranslate,
  mark,
  TranslateDirective,
  TranslatePipe,
  TranslatePlaceholder,
  TranslateStore,
} from '@ng-linguo/linguo';

/**
 * Playground demonstrating message shapes that translate to *structurally
 * different* output across English, Polish, and German. Polish needs four
 * plural categories (one/few/many/other) where English needs two; gendered
 * verbs, ordinals, number grouping, and word order all diverge per language.
 *
 * ICU messages live here as `mark()`-ed fields (not inline at the pipe) because
 * MF2 patterns contain `{{ … }}`, which collides with Angular's `{{ }}`
 * interpolation. `mark()` is a runtime no-op the extractor still collects.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, TranslatePipe, TranslateDirective, TranslatePlaceholder],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly store = inject(TranslateStore);

  protected readonly currentLang = this.store.currentLang;
  protected readonly isReady = this.store.isReady;

  // ── Interactive state driving the examples ────────────────────────────────
  protected readonly count = signal(1);
  protected readonly place = signal(1);
  protected readonly gender = signal<'female' | 'male'>('female');
  protected readonly name = signal('Tomek');

  // ── Cardinal plurals: EN one/other · PL one/few/many/other · DE one/other ──
  protected readonly msgFiles = mark(
    '.input {$count :number} .match $count one {{{$count} file}} * {{{$count} files}}',
  );
  protected readonly msgCartItems = mark(
    '.input {$count :number} .match $count one {{{$count} item in your cart}} * {{{$count} items in your cart}}',
  );

  /** Plural with an exact `0` variant — "No new messages" reads better than "0". */
  protected readonly msgUnread = mark(
    '.input {$count :number} .match $count 0 {{No new messages}} one {{{$count} new message}} * {{{$count} new messages}}',
  );

  /** Ordinal: EN st/nd/rd/th (one/two/few/other) vs PL & DE plain "{n}." */
  protected readonly msgRank = mark(
    '.input {$place :number select=ordinal} .match $place one {{You finished {$place}st}} two {{You finished {$place}nd}} few {{You finished {$place}rd}} * {{You finished {$place}th}}',
  );

  /** Gender select: EN swaps the pronoun; PL swaps the (gendered) past-tense verb. */
  protected readonly msgInvited = mark(
    '.input {$gender :string} .match $gender female {{She invited you}} male {{He invited you}} * {{They invited you}}',
  );

  /** Two selectors at once (count × gender) — the cross-product differs per language. */
  // prettier-ignore
  protected readonly msgFollowers = mark(
    '.input {$count :number} .input {$gender :string} .match $count $gender one female {{She has {$count} follower}} one male {{He has {$count} follower}} * female {{She has {$count} followers}} * male {{He has {$count} followers}} * * {{They have {$count} followers}}',
  );

  /** Number grouping is locale-driven: 1,234,567 / 1.234.567 / 1 234 567. */
  protected readonly msgPopulation = mark('This city has {$n :number} residents');

  /** Simple placeholder whose position moves to clause-final in German. */
  protected readonly msgDownload = mark('Click the button to download {$file}');

  protected readonly greeting = mark('Hello {$name}!');

  /** The `t` pipe's TypeScript counterpart — reactive when read in a computed. */
  private readonly t = injectTranslate();
  protected readonly greetingFromTs = computed(() =>
    this.t('Hello {$name}!', { params: { name: this.name() } }),
  );

  protected setLang(lang: string): void {
    void this.store.setLang(lang);
  }

  protected addCount(delta: number): void {
    this.count.update((n) => Math.max(0, n + delta));
  }

  protected addPlace(delta: number): void {
    this.place.update((n) => Math.max(1, n + delta));
  }

  protected toggleGender(): void {
    this.gender.update((g) => (g === 'female' ? 'male' : 'female'));
  }
}
