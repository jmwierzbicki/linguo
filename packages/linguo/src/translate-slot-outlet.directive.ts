import { Directive, ViewContainerRef, inject, input, type OnInit } from '@angular/core';

import type { SlotNode } from './slot-parser';
import { TranslateDirective } from './translate.directive';

/**
 * Renders the *children* of a slot at this position, so a nested slot binds to
 * its own `<ng-template>` instead of flattening to text. Without it, a slot
 * inside a templated slot renders as plain text (its `$implicit` value); with
 * it, each nested slot finds its own `tFor` template.
 *
 * Bind the `children` from the enclosing slot's context and place the outlet
 * where the nested content should appear:
 *
 * @example
 * ```html
 * <p t="Agree to our [link]Terms and [b]Conditions[/b][/link]">
 *   <ng-template tFor="link" let-kids="children">
 *     <a href="/terms"><ng-container *tRender="kids" /></a>
 *   </ng-template>
 *   <ng-template tFor="b" let-text><strong>{{ text }}</strong></ng-template>
 * </p>
 * ```
 *
 * Valid only inside a `[t]` element's slot template — it resolves the enclosing
 * {@link TranslateDirective} and renders through its shared engine, so nested
 * views are torn down with the rest on a language or params change.
 */
@Directive({ selector: '[tRender]' })
export class TranslateSlotOutlet implements OnInit {
  /** The nodes to render — the `children` value from the slot context. */
  readonly nodes = input.required<readonly SlotNode[]>({ alias: 'tRender' });

  private readonly host = inject(TranslateDirective);
  // The outlet sits on an `<ng-container>`, whose anchor is a comment node; its
  // parent is the element the children belong in, and we render before it.
  private readonly anchor = inject(ViewContainerRef).element.nativeElement as Node;

  ngOnInit(): void {
    const parent = this.anchor.parentNode;
    if (parent) {
      this.host.renderChildren(parent, this.anchor, this.nodes());
    }
  }
}
