---
'@ng-linguo/linguo': minor
---

Add `*tRender` (`TranslateSlotOutlet`) so nested slots can bind to their own
templates instead of flattening to text.

Until now the `[t]` directive bound only top-level slots: a slot _inside_ a
templated slot (e.g. bold inside a link, `[link]…[b]…[/b][/link]`) rendered as
its plain inner text, even though the parser already produced the nested tree.
The new outlet marks where a slot's children should render, and each nested slot
finds its own `tFor` template:

```html
<p t="Agree to our [link]Terms and [b]Conditions[/b][/link]">
  <ng-template tFor="link" let-kids="children">
    <a href="/terms"><ng-container *tRender="kids"></ng-container></a>
  </ng-template>
  <ng-template tFor="b" let-text><strong>{{ text }}</strong></ng-template>
</p>
```

The slot context gains a `children` value (alongside `$implicit`) carrying the
parsed child nodes; bind it with `let-kids="children"`. This is additive —
templates that only use `{{ text }}` are unchanged, and a nested slot still
falls back to text when no `*tRender` is provided. Rendering moves to an internal
`SlotRenderer` shared by the directive and the outlet, so nested views are torn
down with the rest on a language or params change.
