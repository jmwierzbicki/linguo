---
'@ng-linguo/linguo': major
---

Add a `[[` escape to the slot grammar so translatable strings can contain
literal brackets.

Previously a well-formed `[name]…[/name]` was always parsed as a slot and its
tags stripped, so legitimate bracketed text (e.g. a `[note]` in prose) was
silently lost. Now `[[` renders a single literal `[`, which is the one way to
keep tag-shaped text from being parsed as a slot:

```
"Press [[Enter] to send"        → Press [Enter] to send
"Use [[b]bold[[/b], not [b]x[/b]" → Use [b]bold[/b], not x
```

A lone `]` is never significant and needs no escape. This is a grammar change
(CLAUDE.md §5.1), so it ships as a major bump: any existing string that happened
to contain `[[` now renders one fewer `[`. The change is render-time only — the
extractor's key normalization is unaffected, so the §5.2 parity contract holds.
