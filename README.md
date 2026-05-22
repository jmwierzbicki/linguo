# ng-linguo

A modern, complete i18n solution for Angular 21+ applications, built on
SignalStore. A from-scratch successor to `@ngx-translate/core`, competing with
Transloco — reactive by default, with zero RxJS plumbing in your components.

> **Status:** early bootstrap. The workspace, tooling, and package structure are
> in place; `@ng-linguo/core` ships a working seed (a tolerant BBCode parser, the
> `TranslateStore` SignalStore, and the loader interface). See
> [CLAUDE.md](./CLAUDE.md) for the full project contract and conventions.

## Packages

| Package                    | Description                                               |
| -------------------------- | --------------------------------------------------------- |
| `@ng-linguo/core`          | `TranslateStore` (SignalStore), BBCode parser, loader API |
| `@ng-linguo/loader-http`   | `HttpClient`-backed translation loader                    |
| `@ng-linguo/icu`           | ICU pluralization helpers (optional)                      |
| `@ng-linguo/extract`       | Extraction/normalization CLI (pure Node)                  |
| `@ng-linguo/eslint-plugin` | Lint rules for consumers                                  |
| `playground` (app)         | Demo application, never published                         |

## Getting started

This repo uses **pnpm** (never npm/yarn) and **Nx**.

```bash
pnpm install
pnpm nx run-many -t lint test build   # everything
pnpm nx serve playground              # run the demo app
pnpm nx affected -t lint test build   # only what changed (CI default)
```

## Example

```ts
import { provideTranslate, TranslateStore } from '@ng-linguo/core';

bootstrapApplication(AppComponent, {
  providers: [provideTranslate({ defaultLang: 'en', loader: myLoader })],
});

// In a component:
const store = inject(TranslateStore);
store.currentLang(); // Signal<string>
store.isReady(); // Signal<boolean>
await store.setLang('pl');
store.translate('greeting');
```

## Contributing

Read [CLAUDE.md](./CLAUDE.md) first — it is the source of truth for
architecture, code style, testing, and release conventions.
