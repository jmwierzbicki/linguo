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
  type EmbeddedViewRef,
  type OnInit,
} from '@angular/core';

import { parseBBCode, type BBCodeNode } from './bbcode-parser';
import { MESSAGE_FORMATTER } from './message-formatter';
import { TranslateStore } from './translate.store';

/** Context exposed to a placeholder template: the placeholder's inner text. */
export interface TranslatePlaceholderContext {
  readonly $implicit: string;
}

/**
 * Provides an `<ng-template>` as the renderer for a named BBCode placeholder of
 * the enclosing `[t]` element. Declared as a child of the `[t]` element (it
 * renders as an invisible anchor), so the name is scoped to that element. The
 * template receives the placeholder's inner text as its implicit context value.
 *
 * @example
 * ```html
 * <ng-template tFor="docs" let-text>
 *   <a routerLink="/docs">{{ text }}</a>
 * </ng-template>
 * ```
 */
@Directive({ selector: 'ng-template[tFor]' })
export class TranslatePlaceholder {
  /** Placeholder name, matching `[name]...[/name]` in the translation. */
  readonly name = input.required<string>({ alias: 'tFor' });
  readonly templateRef = inject<TemplateRef<TranslatePlaceholderContext>>(TemplateRef);
}

/**
 * Translate the `t` message and render it into the element, applying ICU `tParams`
 * and binding any `[name]...[/name]` BBCode regions to `<ng-template tFor>`
 * placeholder children.
 *
 * The message is the `t` attribute (a string expression), so it may contain both
 * ICU (`{$name}`) and BBCode (`[name]`) safely. Rendered text is emitted as DOM
 * text nodes, never HTML (CLAUDE.md §5.1); a placeholder with no matching
 * template degrades to its inner text. Re-renders when the language, params, or a
 * placeholder template changes.
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
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly formatter = inject(MESSAGE_FORMATTER, { optional: true });

  /** Source message (the translation key); may contain ICU and BBCode. */
  readonly message = input.required<string>({ alias: 't' });
  /** ICU arguments, formatted via `@ng-linguo/icu` when provided. */
  readonly tParams = input<Record<string, unknown> | undefined>(undefined);
  /** Optional disambiguating/contextual text (part of the key). */
  readonly tContext = input<string>('');

  private readonly placeholders = contentChildren(TranslatePlaceholder, { descendants: true });

  private renderedViews: EmbeddedViewRef<TranslatePlaceholderContext>[] = [];
  private renderedNodes: Node[] = [];

  constructor() {
    effect(() => {
      const templates = new Map<string, TemplateRef<TranslatePlaceholderContext>>();
      for (const placeholder of this.placeholders()) {
        templates.set(placeholder.name(), placeholder.templateRef);
      }

      let text = this.store.translate(this.message(), this.tContext());
      const params = this.tParams();
      if (params && this.formatter) {
        text = this.formatter.format(text, params, this.store.currentLang() || 'en');
      }
      this.render(text, templates);
    });
  }

  ngOnInit(): void {
    // Remove any authored whitespace text so the rendered translation is not
    // preceded by stray spacing. Placeholder `<ng-template>` anchors (comments)
    // are left intact for the content query.
    for (const node of Array.from(this.host.childNodes)) {
      if (node.nodeType === 3 /* text node */) {
        this.renderer.removeChild(this.host, node);
      }
    }
  }

  private render(
    message: string,
    templates: ReadonlyMap<string, TemplateRef<TranslatePlaceholderContext>>,
  ): void {
    for (const view of this.renderedViews) {
      view.destroy();
    }
    this.renderedViews = [];
    for (const node of this.renderedNodes) {
      this.renderer.removeChild(this.host, node);
    }
    this.renderedNodes = [];

    for (const node of parseBBCode(message)) {
      this.renderNode(node, templates);
    }
  }

  private renderNode(
    node: BBCodeNode,
    templates: ReadonlyMap<string, TemplateRef<TranslatePlaceholderContext>>,
  ): void {
    if (node.kind === 'text') {
      this.appendText(node.value);
      return;
    }

    const template = templates.get(node.name);
    const innerText = collectText(node.children);
    if (!template) {
      this.appendText(innerText);
      return;
    }

    const view = this.viewContainer.createEmbeddedView(template, { $implicit: innerText });
    view.detectChanges();
    for (const rootNode of view.rootNodes as Node[]) {
      this.renderer.appendChild(this.host, rootNode);
    }
    this.renderedViews.push(view);
  }

  private appendText(value: string): void {
    const textNode = this.renderer.createText(value);
    this.renderer.appendChild(this.host, textNode);
    this.renderedNodes.push(textNode);
  }
}

function collectText(nodes: readonly BBCodeNode[]): string {
  let text = '';
  for (const node of nodes) {
    text += node.kind === 'text' ? node.value : collectText(node.children);
  }
  return text;
}
