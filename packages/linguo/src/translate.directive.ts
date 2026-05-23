import {
  Directive,
  ElementRef,
  Renderer2,
  TemplateRef,
  ViewContainerRef,
  contentChildren,
  effect,
  inject,
  input,
  type OnInit,
} from '@angular/core';

import { MESSAGE_FORMATTER } from './message-formatter';
import { parseSlots, type SlotNode } from './slot-parser';
import { SlotRenderer, type SlotTemplates, type TranslateSlotContext } from './slot-renderer';
import { TranslateStore } from './translate.store';

export type { TranslateSlotContext } from './slot-renderer';

/**
 * Provides an `<ng-template>` as the renderer for a named slot of the enclosing
 * `[t]` element. The `[name]...[/name]` bracket syntax resembles BBCode, but the
 * name is arbitrary and author-chosen — it identifies a slot to fill, not a tag
 * with predefined HTML. Declared as a child of the `[t]` element (it renders as
 * an invisible anchor), so the name is scoped to that element. The template
 * receives the slot's inner text (`let-text`) and parsed children
 * (`let-kids="children"`, for nesting via `*tRender`) as its context.
 *
 * @example
 * ```html
 * <ng-template tFor="docs" let-text>
 *   <a routerLink="/docs">{{ text }}</a>
 * </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[tFor]' })
export class TranslateSlot {
  /** Slot name, matching `[name]...[/name]` in the translation. */
  readonly name = input.required<string>({ alias: 'tFor' });
  readonly templateRef = inject<TemplateRef<TranslateSlotContext>>(TemplateRef);
}

/**
 * Translate the `t` message and render it into the element, applying ICU `tParams`
 * and binding any `[name]...[/name]` slot regions to `<ng-template tFor>`
 * children.
 *
 * The message is the `t` attribute (a string expression), so it may contain both
 * ICU (`{$name}`) and slot tags (`[name]`) safely. Rendered text is emitted as DOM
 * text nodes, never HTML (CLAUDE.md §5.1); a slot with no matching template
 * degrades to its inner text. Nested slots bind to their own templates when the
 * parent template marks where they go with `*tRender` (see
 * `TranslateSlotOutlet`); otherwise a nested slot renders as text. Re-renders
 * when the language, params, or a slot template changes.
 *
 * @example
 * ```html
 * <p t="Hello {$name}!" [tParams]="{ name }"></p>
 *
 * <p t="Read the [docs]documentation[/docs] to get started">
 *   <ng-template tFor="docs" let-text>
 *     <a routerLink="/docs">{{ text }}</a>
 *   </ng-template>
 * </p>
 * ```
 */
@Directive({ selector: '[t]' })
export class TranslateDirective implements OnInit {
  private readonly store = inject(TranslateStore);
  private readonly host = inject<ElementRef<Element>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly formatter = inject(MESSAGE_FORMATTER, { optional: true });
  private readonly slotRenderer = new SlotRenderer(this.renderer, inject(ViewContainerRef));

  /** Source message (the translation key); may contain ICU and slot tags. */
  readonly message = input.required<string>({ alias: 't' });
  /** ICU arguments, formatted via `@ng-linguo/linguo/icu` when provided. */
  readonly tParams = input<Record<string, unknown> | undefined>(undefined);
  /** Optional disambiguating/contextual text (part of the key). */
  readonly tContext = input<string>('');

  private readonly slots = contentChildren(TranslateSlot, { descendants: true });
  private templates: SlotTemplates = new Map();

  constructor() {
    effect(() => {
      const templates = new Map<string, TemplateRef<TranslateSlotContext>>();
      for (const slot of this.slots()) {
        templates.set(slot.name(), slot.templateRef);
      }
      this.templates = templates;

      let text = this.store.translate(this.message(), this.tContext());
      const params = this.tParams();
      if (params && this.formatter) {
        text = this.formatter.format(text, params, this.store.currentLang() || 'en');
      }

      this.slotRenderer.clear();
      this.slotRenderer.render(parseSlots(text), this.host, null, templates, true);
    });
  }

  ngOnInit(): void {
    // Remove any authored whitespace text so the rendered translation is not
    // preceded by stray spacing. Slot `<ng-template>` anchors (comments) are
    // left intact for the content query.
    for (const node of Array.from(this.host.childNodes)) {
      if (node.nodeType === 3 /* text node */) {
        this.renderer.removeChild(this.host, node);
      }
    }
  }

  /**
   * Render a nested slot's `nodes` into `parent` before `before`, reusing the
   * current templates and the shared renderer. Internal: called by
   * `TranslateSlotOutlet` (`*tRender`); not part of the consumer-facing API.
   */
  renderChildren(parent: Node, before: Node, nodes: readonly SlotNode[]): void {
    this.slotRenderer.render(nodes, parent, before, this.templates, false);
  }
}
