---
'@ng-linguo/core': minor
---

The `t` pipe and `injectTranslate()` now render BBCode messages as clean text:
`[name]...[/name]` placeholder tags are dropped and their inner text kept, so a
message like `Read the [docs]documentation[/docs] now` shows as
`Read the documentation now` instead of with literal tags. (Rendering
placeholders into templates — `routerLink`, bindings — still requires the `[t]`
directive; a pipe returns a string and can't instantiate views.)

Adds `bbcodeToText(input)` to flatten a BBCode string to plain text.
