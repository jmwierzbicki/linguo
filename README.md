# ng-linguo

**Signal-native internationalization for Angular.** A modern, complete i18n
toolkit for Angular 18+, built on SignalStore — a from-scratch successor to
`@ngx-translate/core` and an alternative to Transloco, reactive by default with
zero RxJS plumbing in your components.

```html
<!-- translators edit plain text; this renders a real Angular link -->
<p t="Read the [docs]documentation[/docs] to get started">
  <ng-template tFor="docs" let-text><a routerLink="/docs">{{ text }}</a></ng-template>
</p>
```

> **Status:** early (`0.0.1`), not yet published to npm. The runtime, the
> extraction CLI, and the full test suite are in place and green. APIs may still
> shift before `1.0`.

## Why ng-linguo

- **Signals, not subscriptions.** Translations are reactive through
  [`@ngrx/signals`](https://ngrx.io/guide/signals) — switch language and the UI
  updates, no `async` pipe or `Subscription` bookkeeping.
- **Translators never see HTML.** BBCode placeholders `[name]…[/name]` bind to
  _your_ `<ng-template>`, so links, buttons, and bindings render as real Angular
  while the translation file stays plain text. Translator content is never
  inserted as HTML — XSS surface is zero by construction.
- **ICU MessageFormat 2** (and MF1) for correct plurals, `select`, and gendered
  text per locale — Polish gets four plural forms, English gets two, all from
  one message.
- **Context disambiguation.** The same source text can carry different
  translations (`Play` in a game vs. a music player) via a `context` that
  becomes part of the key.
- **A real extraction workflow.** Extract source strings to standard gettext
  `.po` files (works with Crowdin/Lokalise/Phrase), compile to runtime JSON,
  and even copy an LLM translation prompt to your clipboard.
- **Zoneless-ready, SSR-friendly, tree-shakeable.**

## Install

```bash
npm i @ng-linguo/linguo @ngrx/signals
```

Requires **Angular 18+**. `@ngrx/signals` is a peer dependency — bring your own.

## Quick start

**1. Configure the runtime.** Provide a loader; loading is explicit, so no HTTP
fires during DI setup.

```ts
import { provideTranslate, type TranslationLoader } from '@ng-linguo/linguo';
import { provideIcu } from '@ng-linguo/linguo/icu';

const loader: TranslationLoader = {
  load: (lang) => fetch(`/assets/i18n/${lang}.json`).then((r) => r.json()),
};

export const appConfig = {
  providers: [
    provideTranslate({ defaultLang: 'en', loader }),
    provideIcu(), // optional — enables ICU MessageFormat (defaults to MF2)
  ],
};
```

**2. Start the first load** (explicit — e.g. in your root component or an app
initializer). `isReady` lets you gate the UI to avoid a flash of untranslated
content:

```ts
import { inject } from '@angular/core';
import { TranslateStore } from '@ng-linguo/linguo';

private store = inject(TranslateStore);
constructor() { void this.store.setLang('en'); }
readonly ready = this.store.isReady; // Signal<boolean>
```

**3. Translate.** In templates use the `t` pipe and the `[t]` directive; in
TypeScript use `injectTranslate()`.

```html
<!-- plain text -->
{{ 'Save' | t }}

<!-- ICU placeholders & plurals -->
{{ 'Hello {$name}!' | t: { params: { name } } }}

<!-- context: same text, different translation -->
{{ 'Play' | t: { context: 'game' } }}

<!-- rich text: [tag] placeholders bound to your templates (see the hero above) -->
<p t="[b]Warning:[/b] this cannot be undone">
  <ng-template tFor="b" let-text><strong>{{ text }}</strong></ng-template>
</p>
```

```ts
import { injectTranslate } from '@ng-linguo/linguo';

const t = injectTranslate();
t('Hello {$name}!', { params: { name: 'Ada' } }); // reactive when read in a computed
```

## Extraction CLI

`@ng-linguo/extract` is a pure-Node CLI (no Angular dependency) that turns your
source into translation files and back:

```bash
npx linguo-extract              # guided interactive menu
linguo-extract extract          # scan source → <locale>.po catalogs
linguo-extract compile          # .po catalogs → runtime <locale>.json
linguo-extract copyprompt pl    # copy an LLM translation prompt to the clipboard
```

It reads a `linguo.config.json` (auto-discovered) listing your locales and paths.

## Packages & entry points

| Import                     | What it gives you                                                              |
| -------------------------- | ------------------------------------------------------------------------------ |
| `@ng-linguo/linguo`        | `TranslateStore`, the `t` pipe, the `[t]` directive, `injectTranslate`, `mark` |
| `@ng-linguo/linguo/icu`    | `provideIcu` — ICU MessageFormat 1 + 2                                         |
| `@ng-linguo/linguo/http`   | `createHttpLoader` — `HttpClient`-backed loader                                |
| `@ng-linguo/extract`       | build-time extraction/compile CLI (pure Node)                                  |
| `@ng-linguo/eslint-plugin` | lint rules for consumers                                                       |

## Contributing

This is an Nx + pnpm monorepo. [CLAUDE.md](./CLAUDE.md) is the source of truth
for architecture, code style, testing, and release conventions — read it first.

```bash
pnpm install
pnpm nx run-many -t lint test build   # the full suite (what CI runs)
pnpm nx serve playground              # the demo app
```

## License

[MIT](./LICENSE)
