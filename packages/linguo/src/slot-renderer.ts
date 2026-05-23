import type { EmbeddedViewRef, Renderer2, TemplateRef, ViewContainerRef } from '@angular/core';

import type { SlotNode } from './slot-parser';

/**
 * Context handed to a slot's `<ng-template tFor>`:
 *
 * - `$implicit` — the slot's inner text, flattened to a string. `let-text` binds
 *   it, so `{{ text }}` renders a plain-text slot (the common case).
 * - `children` — the slot's parsed child nodes, for binding *nested* slots to
 *   their own templates with `*tRender` instead of flattening them to text. Bind
 *   it with `let-kids="children"`. See `TranslateSlotOutlet`.
 */
export interface TranslateSlotContext {
  readonly $implicit: string;
  readonly children: readonly SlotNode[];
}

/** Map from a slot name to the `<ng-template>` that renders it. */
export type SlotTemplates = ReadonlyMap<string, TemplateRef<TranslateSlotContext>>;

/** Flatten a slot subtree to its concatenated text, dropping the tags. */
function collectText(nodes: readonly SlotNode[]): string {
  let text = '';
  for (const node of nodes) {
    text += node.kind === 'text' ? node.value : collectText(node.children);
  }
  return text;
}

/**
 * Renders a parsed slot tree into the DOM as text nodes and embedded
 * `<ng-template>` views — never as HTML (CLAUDE.md §5.1).
 *
 * Owns the views and host-level text nodes it creates so a re-render (a language
 * or params change) can tear them down. A single instance is shared by a `[t]`
 * element and every `*tRender` outlet nested inside it: views are tracked flat
 * and destroyed together, so a re-render is a clean teardown-then-rebuild
 * regardless of nesting depth.
 */
export class SlotRenderer {
  private views: EmbeddedViewRef<TranslateSlotContext>[] = [];
  private hostNodes: Node[] = [];

  constructor(
    private readonly renderer: Renderer2,
    private readonly viewContainer: ViewContainerRef,
  ) {}

  /** Destroy every view and remove every host-level text node from the last render. */
  clear(): void {
    for (const view of this.views) {
      view.destroy();
    }
    this.views = [];
    for (const node of this.hostNodes) {
      // Nodes placed inside an embedded view are gone with their view; only the
      // ones appended straight onto the persistent host element remain here.
      if (node.parentNode) {
        this.renderer.removeChild(node.parentNode, node);
      }
    }
    this.hostNodes = [];
  }

  /**
   * Render `nodes` into `parent`, before `before` (or appended when `before` is
   * `null`). `trackHost` is `true` only for nodes placed directly on the `[t]`
   * host element — those text nodes outlive any single view and must be removed
   * explicitly on the next render; nodes inside an embedded view ride along when
   * that view is destroyed, so they are not tracked.
   */
  render(
    nodes: readonly SlotNode[],
    parent: Node,
    before: Node | null,
    templates: SlotTemplates,
    trackHost: boolean,
  ): void {
    for (const node of nodes) {
      if (node.kind === 'text') {
        const text = this.renderer.createText(node.value);
        this.insert(parent, text, before);
        if (trackHost) {
          this.hostNodes.push(text);
        }
        continue;
      }

      const template = templates.get(node.name);
      if (!template) {
        // No matching template: render the slot's children inline (transparent),
        // so a nested *matched* slot still renders and text-only content reads
        // the same as a plain flatten.
        this.render(node.children, parent, before, templates, trackHost);
        continue;
      }

      const view = this.viewContainer.createEmbeddedView(template, {
        $implicit: collectText(node.children),
        children: node.children,
      });
      this.views.push(view);
      // Running the view's bindings instantiates any `*tRender` outlet inside it,
      // which calls back to render this slot's children into that outlet — the
      // nesting recursion happens here, on the call stack.
      view.detectChanges();
      for (const rootNode of view.rootNodes as Node[]) {
        this.insert(parent, rootNode, before);
      }
    }
  }

  private insert(parent: Node, node: Node, before: Node | null): void {
    if (before) {
      this.renderer.insertBefore(parent, node, before);
    } else {
      this.renderer.appendChild(parent, node);
    }
  }
}
