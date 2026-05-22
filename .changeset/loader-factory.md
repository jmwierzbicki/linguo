---
'@ng-linguo/linguo': minor
---

`provideTranslate`'s `loader` now also accepts a **factory** `() => TranslationLoader`,
which is run inside Angular's injection context. This lets DI-dependent loaders
— notably `createHttpLoader()` from `@ng-linguo/linguo/http`, which injects
`HttpClient` — be wired up directly:

```ts
provideHttpClient(),
provideTranslate({ defaultLang: 'en', loader: () => createHttpLoader() }),
```

Ready-made loader objects (static dictionaries, `fetch`-based loaders) keep
working unchanged — the factory form is purely additive.
