---
'@ng-linguo/core': minor
'@ng-linguo/extract': minor
---

Add `mark()` — an extraction marker for messages defined outside a template.

`mark(message)` returns the string unchanged at runtime but lets the extractor
collect it, so messages held in component fields or constants (e.g. an ICU
message, which cannot be inlined in a `{{ }}` binding because it contains `}}`)
are still extracted into the catalogs. The scanner recognizes `mark('...')`
calls (ignoring method calls like `foo.mark(...)`); the marked string is
translated at render time by the pipe/directive that consumes it.
