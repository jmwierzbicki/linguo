import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { TranslatePipe } from '@ng-linguo/linguo';

/**
 * highlight.js is loaded as a global from a CDN in index.html (playground only).
 * Declare just the slice of its surface we touch so we stay off `any`.
 */
declare global {
  interface Window {
    hljs?: { highlightElement(el: HTMLElement): void };
  }
}

/** Languages the playground's code samples are written in. */
export type CodeLang = 'typescript' | 'html' | 'json' | 'bash';

/**
 * A syntax-highlighted, copyable code block. Sets the code as a text node and
 * hands the element to highlight.js after each render so token markup never
 * fights Angular's own DOM updates.
 */
@Component({
  selector: 'app-code-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
  template: `<div class="group relative">
    <button
      type="button"
      (click)="copy()"
      class="absolute right-3 top-3 z-10 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-xs text-slate-300 opacity-0 transition hover:bg-slate-700 hover:text-white group-hover:opacity-100"
    >
      {{ copied() ? ('Copied' | t) : ('Copy' | t) }}
    </button>
    <pre
      class="overflow-x-auto bg-slate-950 px-5 py-4 text-sm leading-relaxed"
    ><code #codeEl></code></pre>
  </div>`,
})
export class CodeBlockComponent {
  /** The source to display. Rendered verbatim — never interpreted. */
  readonly code = input.required<string>();
  /** Grammar passed to highlight.js. */
  readonly lang = input<CodeLang>('typescript');

  protected readonly copied = signal(false);

  private readonly codeEl = viewChild.required<ElementRef<HTMLElement>>('codeEl');

  constructor() {
    // Re-runs after render whenever code()/lang() change, so switching tabs (a
    // new code() value) re-highlights without us tracking the element's state.
    afterRenderEffect(() => {
      const el = this.codeEl().nativeElement;
      el.textContent = this.code();
      el.className = `language-${this.lang()}`;
      el.removeAttribute('data-highlighted');
      window.hljs?.highlightElement(el);
    });
  }

  protected copy(): void {
    void navigator.clipboard?.writeText(this.code()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }
}
