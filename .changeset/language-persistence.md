---
'@ng-linguo/linguo': minor
---

Remember the selected language and detect the browser's preferred one. A new
`TranslateStore.restoreLang()` resolves the startup language as **persisted →
browser-preferred → `defaultLang`** and loads it; `setLang` now persists the
choice to `localStorage`. Both behaviors are on by default, configurable, and
SSR-safe (all `localStorage`/`navigator` access goes through
`DOCUMENT.defaultView`, which is null on the server).

New `provideTranslate` options:

- `supportedLangs?: readonly string[]` — languages you ship; used to match a
  persisted/browser value to one that exists.
- `persistSelectedLanguage?: boolean` (default `true`) — sync the active
  language to `localStorage`.
- `persistKey?: string` (default `ng-linguo.lang`).
- `detectBrowserLanguage?: boolean` (default `true`) — use `navigator.languages`
  on first run.

```ts
provideTranslate({ defaultLang: 'en', supportedLangs: ['en', 'pl', 'de'], loader });
// at startup:
inject(TranslateStore).restoreLang();
```
