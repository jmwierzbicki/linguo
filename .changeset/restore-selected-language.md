---
'@ng-linguo/linguo': minor
---

Decouple restoring the persisted language from persisting it. A new
`restoreSelectedLanguage?: boolean` option on `provideTranslate` controls only
the **read on startup** (inside `restoreLang()`), while `persistSelectedLanguage`
keeps controlling the **write**. This lets an app keep persisting the active
language while owning the restore decision itself.

It defaults to `persistSelectedLanguage`, so disabling persistence alone still
disables restore as before — set it explicitly to override:

```ts
// persist the choice, but I'll run my own startup selection
provideTranslate({ defaultLang: 'en', restoreSelectedLanguage: false, loader });
```
