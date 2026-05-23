---
'@ng-linguo/linguo': major
---

Rename the "BBCode" placeholder API to "slots". The `[name]...[/name]` bracket
**syntax is unchanged** (and stays a BBCode-like surface), but the names are
arbitrary, author-chosen slot names bound to your own `<ng-template>` — they
carry no predefined HTML, so "BBCode" was a misleading label.

Public API renames:

- `parseBBCode` → `parseSlots`
- `bbcodeToText` → `slotsToText`
- `BBCodeNode` → `SlotNode` (its `kind: 'placeholder'` variant is now `kind: 'slot'`)
- `TranslatePlaceholder` → `TranslateSlot`
- `TranslatePlaceholderContext` → `TranslateSlotContext`

The `[t]` directive and the `tFor` template attribute are unchanged.
