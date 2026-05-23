<p align="center">
  <img
    src="https://raw.githubusercontent.com/jmwierzbicki/linguo/main/apps/playground/public/linguo-logo.png"
    alt="ng-linguo"
    width="640"
  />
</p>

# ng-linguo

**Signal-native internationalization for Angular.** A modern, complete i18n
toolkit for Angular 18+, built on SignalStore — an independent, from-scratch
alternative to `@ngx-translate/core` and Transloco, reactive by default with
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
- **Translators never see HTML.** Named slots `[name]…[/name]` (a BBCode-like
  syntax) bind to _your_ `<ng-template>`, so links, buttons, and bindings render
  as real Angular while the translation file stays plain text. Translator
  content is never inserted as HTML — XSS surface is zero by construction.
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

**1. Configure the runtime.** Pick a loader. Loading is explicit — nothing is
fetched during DI setup.

Most apps load their translation JSON over HTTP:

```ts
import { provideTranslate } from '@ng-linguo/linguo';
import { createHttpLoader } from '@ng-linguo/linguo/http';
import { provideIcu } from '@ng-linguo/linguo/icu';
import { provideHttpClient } from '@angular/common/http';

export const appConfig = {
  providers: [
    provideHttpClient(),
    provideTranslate({
      defaultLang: 'en',
      supportedLangs: ['en', 'pl', 'de'], // languages you ship (used for matching)
      // factory form: the loader is built in DI, so it can use HttpClient.
      // GETs /assets/i18n/<lang>.json by default.
      loader: () => createHttpLoader(),
    }),
    provideIcu(), // optional — enables ICU MessageFormat (defaults to MF2)
  ],
};
```

Prefer to **bundle** translations (no network)? A loader is just an object with
a `load(lang)` method, so a static import works too:

```ts
import en from './i18n/en.json';
import pl from './i18n/pl.json';

const dictionaries: Record<string, unknown> = { en, pl };

provideTranslate({
  defaultLang: 'en',
  loader: { load: (lang) => Promise.resolve(dictionaries[lang] ?? {}) },
});
```

**2. Start loading** at startup. `restoreLang()` picks the language for you —
**persisted choice → browser preference → `defaultLang`** — and loads it.
`isReady` lets you gate the UI to avoid a flash of untranslated content:

```ts
import { inject } from '@angular/core';
import { TranslateStore } from '@ng-linguo/linguo';

private store = inject(TranslateStore);
constructor() { void this.store.restoreLang(); }
readonly ready = this.store.isReady; // Signal<boolean>
```

The active language is remembered in `localStorage`, and the browser's preferred
language is used on the first visit — both **on by default** and **SSR-safe**.
Set `supportedLangs` so a stored/browser value can be matched; turn either off
with `persistSelectedLanguage: false` / `detectBrowserLanguage: false`. To switch
languages later, call `store.setLang('pl')` (it also updates the saved choice).

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

// Reactive AND zero per-change-detection cost: recomputes only when `name()`
// or the active language changes. Prefer this for hot or looped bindings.
readonly greeting = computed(() => t('Hello {$name}!', { params: { name: this.name() } }));
```

> **Performance:** the `t` pipe is memoized — the lookup/format re-runs only when
> the key, `params` contents, `context`, or language actually change (so a fresh
> `{ params: … }` literal each change-detection pass is just an equality check).
> For hot paths, the `injectTranslate()` + `computed()` form above does no work
> per change-detection pass at all.

## Extraction CLI

`@ng-linguo/extract` is a pure-Node CLI (no Angular dependency) that turns your
source into translation files and back:

```bash
npx linguo-extract              # guided interactive menu (creates/edits config too)
linguo-extract init             # create or edit linguo.config.json (interactive)
linguo-extract extract          # scan source → <locale>.po catalogs
linguo-extract compile          # .po catalogs → runtime <locale>.json
linguo-extract copyprompt pl    # copy an LLM translation prompt to the clipboard
```

`init` also runs non-interactively for scripts/CI:
`linguo-extract init --locales en,pl,de --out public/i18n`.

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
