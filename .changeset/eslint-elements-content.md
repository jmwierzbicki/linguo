---
'@ng-linguo/eslint-plugin': minor
---

Ship a `configs.recommended` flat-config preset.

- New `configs` export. `configs.recommended` safelists the `t` attribute on
  `@angular-eslint/template/elements-content`, so an empty `<h2 t="Setup"></h2>`
  (whose text the `[t]` directive supplies at runtime) is no longer flagged as
  missing content — without disabling the accessibility check for any other
  empty heading, anchor, or button.
- README documents all three configuration methods: the preset, the rule option
  by hand (flat + legacy config), and the static-fallback pattern that needs no
  plugin and doubles as a no-flash fallback.
