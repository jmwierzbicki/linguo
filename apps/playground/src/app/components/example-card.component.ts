import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { TranslatePipe } from '@ng-linguo/linguo';

import { CodeBlockComponent, type CodeLang } from './code-block.component';

/** One code tab inside an {@link ExampleCardComponent}. */
export interface CodeTab {
  /** Tab label, e.g. `Template`, `TypeScript`, `JSON`. */
  label: string;
  /** Highlight grammar for the snippet. */
  lang: CodeLang;
  /** The snippet to show. */
  code: string;
}

/**
 * A documentation example: a titled card with a live "Preview" tab (projected
 * content) followed by one code tab per {@link CodeTab}. Set `hasPreview` to
 * false for code-only sections such as installation snippets.
 */
@Component({
  selector: 'app-example-card',
  imports: [CodeBlockComponent, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section class="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
    <header class="border-b border-slate-800 px-5 py-4">
      <h3 class="text-base font-semibold text-slate-100">{{ title() }}</h3>
      @if (description()) {
        <p class="mt-1 text-sm leading-relaxed text-slate-400">{{ description() }}</p>
      }
    </header>

    <div
      role="tablist"
      class="flex flex-wrap items-center gap-1 border-b border-slate-800 px-3 py-2"
    >
      @if (hasPreview()) {
        <button
          type="button"
          role="tab"
          (click)="active.set(-1)"
          [class]="tabClass(active() === -1)"
        >
          {{ 'Preview' | t }}
        </button>
      }
      @for (tab of tabs(); track tab.label; let i = $index) {
        <button type="button" role="tab" (click)="active.set(i)" [class]="tabClass(active() === i)">
          {{ tab.label }}
        </button>
      }
    </div>

    <!-- Kept mounted (just hidden) so interactive preview state survives a tab switch. -->
    <div [hidden]="active() !== -1" class="px-5 py-5">
      <ng-content></ng-content>
    </div>
    @if (currentTab(); as tab) {
      <app-code-block [code]="tab.code" [lang]="tab.lang" />
    }
  </section>`,
})
export class ExampleCardComponent {
  /** Heading shown at the top of the card. */
  readonly title = input.required<string>();
  /** Optional sub-heading explaining what the example demonstrates. */
  readonly description = input('');
  /** Code tabs rendered after the preview. */
  readonly tabs = input.required<CodeTab[]>();
  /** Whether to show the live Preview tab (first). */
  readonly hasPreview = input(true);

  /** -1 selects the preview; 0..n select the matching code tab. */
  protected readonly active = linkedSignal<number>(() => (this.hasPreview() ? -1 : 0));

  protected readonly currentTab = computed(() => {
    const i = this.active();
    return i > -1 ? this.tabs()[i] : undefined;
  });

  protected tabClass(selected: boolean): string {
    const base = 'rounded-md px-3 py-1.5 text-sm font-medium transition';
    return selected
      ? `${base} bg-slate-800 text-slate-100`
      : `${base} text-slate-400 hover:bg-slate-800/60 hover:text-slate-200`;
  }
}
