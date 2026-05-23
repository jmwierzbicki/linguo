---
'@ng-linguo/core': minor
'@ng-linguo/extract': minor
---

Unify the runtime API under a short `t` name with a consistent shape:

- **Pipe `t`** takes a single options object: `{{ 'Hello {$name}!' | t: { params: { name } } }}`,
  `{{ 'Play' | t: { context: 'game' } }}`. (`TranslateOptions = { params?, context? }`.)
- **Directive `[t]`** takes the message as the `t` **attribute** (a string, so ICU `{ }`
  and slot tags `[ ]` are both safe there), with `[tParams]` for ICU args and `tContext`
  for context: `<p t="Hello {$name}!" [tParams]="{ name }"></p>`. Slots are
  `<ng-template tFor="name">` children, scoped per element via a content query (no global
  names, no setup). This makes ICU work in the directive — it couldn't when the message was
  element content, because Angular ICU-parses `{ }` in text.
- **`injectTranslate()`** returns a `t(key, options?)` function — the pipe's counterpart for
  component code. Obtain it in an injection context; the returned `t` reads the store's
  signals when called, so it's reactive in templates or inside a `computed`. The pipe now
  delegates to it.
- **extract** scans `'…' | t` (context from the options object), the `t="…"` attribute
  (with `tContext`), the `t('…', { context })` helper call, and `mark('…')`.
