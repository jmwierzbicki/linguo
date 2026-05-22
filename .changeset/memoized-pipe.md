---
'@ng-linguo/linguo': patch
---

The `t` pipe now memoizes by value. It stays impure (so it re-renders on
language change), but the lookup/ICU-format only re-runs when the key, `context`,
`params` contents, or the active language actually change — a fresh
`{ params: … }` object literal on every change-detection pass is now just an
equality check instead of a full re-translate. Output is unchanged. For hot or
looped bindings, prefer `injectTranslate()` inside a `computed()`, which does no
work per change-detection pass.
