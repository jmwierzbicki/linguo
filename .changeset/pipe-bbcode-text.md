---
'@ng-linguo/core': minor
---

The `t` pipe and `injectTranslate()` now render slot-tagged messages as clean
text: `[name]...[/name]` slot tags are dropped and their inner text kept, so a
message like `Read the [docs]documentation[/docs] now` shows as
`Read the documentation now` instead of with literal tags. (Rendering slots
into templates — `routerLink`, bindings — still requires the `[t]` directive; a
pipe returns a string and can't instantiate views.)

Adds `slotsToText(input)` to flatten a slot-tagged string to plain text.
