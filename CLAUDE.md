# CLAUDE.md — ng-linguo

A modern, complete i18n solution for Angular 21+ applications, built on
SignalStore.

This file is the source of truth for project conventions. Read it fully before
making changes. When in doubt, follow it literally rather than improvising.

---

## 0. What this project is

**ng-linguo** is a publishable Angular library family under the `@ng-linguo/*`
npm scope. It replaces `@ngx-translate/core` and competes with Transloco.
It is **not** an extension of `ngx-translate`. It is a from-scratch successor.

The core API is a **SignalStore** (`@ngrx/signals`), not a service class.
Consumers inject a store, read translations via signals, and the whole runtime
is reactive without RxJS plumbing.

Seed feature: BBCode-style placeholders bound to `<ng-template>` so translators
never see HTML. Planned scope also includes: ICU pluralization, type-safe
translation keys, async loaders, lazy scopes, an extraction CLI.

The audience is Angular developers building production apps. Every API
decision is evaluated against: _does this make the translator's life easier
without making the developer's life harder?_

---

## 1. Setup (read this on first run, then skip it)

### 1.1 Prerequisites

- Node.js 20.x LTS or 22.x LTS — pin in `.nvmrc`
- pnpm 9+ — **never use npm or yarn** for this repo
- Angular 21+ (do not downgrade for "compatibility")
- `@ngrx/signals` 18+

### 1.2 Bootstrap

```bash
pnpm dlx create-nx-workspace@latest ng-linguo \
  --preset=angular-monorepo \
  --packageManager=pnpm \
  --bundler=esbuild \
  --style=scss \
  --e2eTestRunner=playwright \
  --unitTestRunner=jest \
  --standalone \
  --strict
```

Then for each publishable package:

```bash
pnpm nx g @nx/angular:library core \
  --directory=packages/core \
  --publishable \
  --importPath=@ng-linguo/linguo \
  --buildable \
  --standalone \
  --skipTests=false
```

Add SignalStore to core:

```bash
pnpm add @ngrx/signals -F @ng-linguo/linguo
```

`@ngrx/signals` is a **peer dependency** in published packages, not a regular
dep. Consumers bring their own version.

### 1.3 Repository layout (immutable — do not restructure without discussion)

```
ng-linguo/
├── packages/
│   ├── linguo/                → @ng-linguo/linguo (the Angular runtime)
│   │   ├── src/               → primary entry point: TranslateStore, t pipe,
│   │   │                         [t] directive, BBCode parser, public types
│   │   ├── icu/               → @ng-linguo/linguo/icu  (ICU MF1/MF2, provideIcu)
│   │   └── http/              → @ng-linguo/linguo/http (createHttpLoader)
│   ├── extract/               → @ng-linguo/extract (CLI; pure Node, zero Angular deps)
│   └── eslint-plugin/         → @ng-linguo/eslint-plugin (lint rules for consumers)
├── apps/
│   └── playground/            → demo app, never published
├── tools/                     → repo-internal scripts only
├── docs/                      → docs site (Astro/Starlight)
├── CLAUDE.md                  → this file
├── README.md                  → user-facing
├── CONTRIBUTING.md
└── nx.json, pnpm-workspace.yaml, tsconfig.base.json
```

### 1.4 First-run checklist

- [ ] `.nvmrc` pinning Node version
- [ ] `pnpm-workspace.yaml` covers `packages/*` and `apps/*`
- [ ] `tsconfig.base.json` has `strict: true`, `noUncheckedIndexedAccess: true`,
      `exactOptionalPropertyTypes: true`
- [ ] ESLint with `@angular-eslint`, `@typescript-eslint/strict-type-checked`
- [ ] Prettier configured, runs in pre-commit via Husky + lint-staged
- [ ] Each `packages/*/package.json` has `"sideEffects": false` unless it
      genuinely has side effects
- [ ] Each `packages/*/package.json` declares `@ngrx/signals` and `@angular/*`
      as `peerDependencies`, not `dependencies`
- [ ] `packages/*/ng-package.json` configured for ng-packagr
- [ ] Jest configured with `jest-preset-angular`
- [ ] CI: lint, test, build, `nx affected` for PR speed
- [ ] Changesets (`@changesets/cli`) for versioning — **not** lerna, **not**
      semantic-release

---

## 2. Architectural rules (these are not negotiable)

### 2.1 Package boundaries

- **The Angular runtime is ONE package, `@ng-linguo/linguo`**, with secondary
  entry points (`/icu`, `/http`) so optional features stay tree-shakeable
  without introducing cross-package `@ng-linguo/*` dependencies (and the
  `workspace:`-protocol publishing headaches they cause). Secondary entry
  points import the primary by its package name (`@ng-linguo/linguo`); ng-packagr
  externalizes that so the primary is never inlined into a secondary bundle.
- **`@ng-linguo/extract` is pure Node and stays a separate package.** It must
  not import a single line from `@angular/*` or `@ngrx/*`. It is a build-time
  tool that runs in CI on Node without a DOM — keeping it out of the runtime
  package means installing the CLI never drags Angular along.
- **`@ng-linguo/eslint-plugin` stays separate** — it runs inside ESLint, a
  different consumer entirely.
- **Never import from another entry point's internal files directly.** A
  secondary entry point reaches the primary only through `@ng-linguo/linguo`,
  never via a relative `../../src/...` path.

### 2.2 What goes in the primary entry point vs. `/icu`, `/http`

- The **primary** (`@ng-linguo/linguo`) contains: `TranslateStore` (SignalStore),
  the `[t]` directive, the BBCode parser, the public types, the loader interface,
  the `MessageFormatter` interface + token.
- The primary does **not** contain: ICU formatting, HTTP loaders, route
  integration. ICU lives in the `/icu` entry point; the HTTP loader in `/http`.
- If you find yourself reaching for a fetch/XHR call in the primary, stop —
  that belongs in `@ng-linguo/linguo/http`. ICU/`messageformat` imports belong
  only in `@ng-linguo/linguo/icu`.

### 2.3 The SignalStore API contract

The public runtime API is built with `@ngrx/signals`. This shapes everything:

- **The translation runtime is a `signalStore`**, not an `@Injectable()` class.
  Provided via `providedIn: 'root'` at the store definition, or scoped via
  feature providers.
- **Reads are signals.** Public state is exposed as readonly signals via the
  store's `select` and `computed` features. No `Observable` getters on the
  public API.
- **Writes are store methods.** Defined via `withMethods`. Methods are
  synchronous unless they explicitly return `Promise<void>`.
- **Side effects use `rxMethod` from `@ngrx/signals/rxjs-interop`** when an
  RxJS pipeline is genuinely the right tool (HTTP, debounce, switchMap).
  Otherwise prefer `effect()` from `@angular/core`.
- **Custom features go in `packages/linguo/src/features/`.** Each is a
  `signalStoreFeature(...)` factory with TSDoc and a test.
- **Never expose the raw store internals.** Consumers see the store's public
  signals/methods only. Private state is held via `withState` but kept off the
  exposed shape using `withProps` or feature-private patterns.

Reference public surface (illustrative, will evolve):

```ts
// What consumers import
import { TranslateStore, provideTranslate } from '@ng-linguo/linguo';

@Component({...})
class MyComp {
  private store = inject(TranslateStore);
  readonly currentLang = this.store.currentLang;   // Signal<string>
  readonly isReady = this.store.isReady;           // Signal<boolean>
  greet() { this.store.setLang('pl'); }
}
```

### 2.4 Public API surface

- Every package has an `index.ts` (or `public-api.ts`) that is the **only**
  thing consumers can import. Internal modules are not re-exported.
- Every exported symbol has a TSDoc comment. No exceptions, including types.
- **Never** export something "for testing." If a test needs internals, put the
  test next to the source and import relatively.
- Breaking changes to the public API require a changeset marked `major`. The
  SignalStore's exposed shape (signal names, method signatures) is part of the
  public API — adding methods is `minor`, renaming or removing is `major`.

### 2.5 Angular conventions

- **Standalone everything.** No `NgModule` in any new code. If a third-party
  dep requires NgModule, wrap it; don't propagate.
- **Signals over RxJS for state.** RxJS only at I/O boundaries (HTTP, event
  streams from libraries that emit Observables). Inside the store, prefer
  `computed`, `effect`, and SignalStore features.
- **`inject()` over constructor injection.** Constructors are for parameter
  defaults and capturing references, not for DI plumbing.
- **No `providedIn: 'any'`.** Use `'root'` or scope explicitly via providers.
- **No `OnPush` without a reason in the JSDoc.** Default to `OnPush` for
  components, but if you ever deviate, write why.
- **Zoneless-compatible.** Code in this library must work with
  `provideExperimentalZonelessChangeDetection()`. CI runs the playground app
  in zoneless mode.

### 2.6 TypeScript rules

- `strict: true` is non-negotiable. Plus:
  - `noUncheckedIndexedAccess: true`
  - `exactOptionalPropertyTypes: true`
  - `noImplicitOverride: true`
- **Never `any`.** Use `unknown` and narrow. If you genuinely need an escape
  hatch, use `// eslint-disable-next-line` with a comment explaining why.
- **Never `as` to cross unrelated types.** `as` is allowed only for narrowing
  within a type's own hierarchy.
- **No `!` non-null assertions** in library code. Tests may use them sparingly.
- **No `enum`.** Use string literal unions or `as const` objects.
- **No default exports.** Named exports only.

---

## 3. Code style (strict)

### 3.1 Naming

- Files: `kebab-case.ts`. Angular suffixes preserved: `*.component.ts`,
  `*.directive.ts`, `*.pipe.ts`.
- SignalStore files: `*.store.ts` (e.g. `translate.store.ts`).
  SignalStore features: `with-*.ts` (e.g. `with-loader.ts`,
  `with-bbcode-parser.ts`) — matches the `withFoo()` convention from NgRx.
- Symbols: `PascalCase` for classes/types/interfaces/stores, `camelCase` for
  variables/functions/features, `SCREAMING_SNAKE_CASE` for module-level
  constants only.
- No `I`-prefix on interfaces. No `T`-prefix on type aliases.
- Test files: `*.spec.ts` colocated with source.

### 3.2 Files

- One public class/store/function per file in `core`. Helpers can share a file
  but must not be exported from `index.ts`.
- Each SignalStore feature lives in its own file with its tests next to it.
- Max line length: 100. Prettier enforces it; do not fight it.
- No barrel files except the package's single `index.ts`. Internal directories
  do not get `index.ts` files.

### 3.3 Comments

- Comments explain **why**, not **what**. The code shows what.
- TSDoc on every public symbol. Use `@example` for non-obvious APIs.
- TODO/FIXME must include a GitHub issue link. Bare `TODO:` comments fail CI.

### 3.4 Imports

- Order: node builtins → external packages → `@ng-linguo/*` → relative.
  ESLint enforces. Do not group manually.
- Use the path aliases from `tsconfig.base.json` for cross-package imports
  inside the monorepo. Never use `../../../`.

---

## 4. Testing rules

### 4.1 What must be tested

- Every public function/feature/store method in `core` and every public
  function in `extract`: 100% line coverage is not the goal, but every branch
  of the public API must have at least one test exercising it.
- Every bug fix ships with a regression test. No exceptions.
- The BBCode parser is the canary — it has a dedicated test file with cases
  for every grammar rule and every malformed-input tolerance. Treat it as a
  reference for the quality bar.

### 4.2 How to test

- Unit tests with Jest. Component DOM tests with Angular Testing Library.
- **No `TestBed` for pure functions.** If something can be tested without
  Angular, test it without Angular. The BBCode parser, the normalizer, and
  the extractor are pure-Node tests.
- **SignalStores are tested with `TestBed.configureTestingModule`** providing
  the store, then asserting on its signals via `store.someSignal()` and
  invoking methods directly. No `getTestScheduler` or marble nonsense for
  signal-based code.
- For SignalStore features in isolation: instantiate a throwaway store that
  composes only the feature under test. Don't drag the whole `TranslateStore`
  into a feature unit test.
- Tests are colocated: `foo.ts` → `foo.spec.ts` in the same folder.
- Test names are full sentences: `it('returns the source text when the key is empty')`.
  Not `it('should work')`. Not `it('test 1')`.
- One assertion subject per test. Setup can be shared, but the _thing being
  verified_ should be one thing.

### 4.3 What NOT to test

- Don't test Angular itself. If your test is checking that `*ngIf` hides
  elements, delete it.
- Don't test `@ngrx/signals` itself. If your test is checking that `computed`
  recomputes, delete it.
- Don't test private store state. Test through the public signals and methods.
  If you can't observe a behavior through the public API, that behavior
  doesn't exist.
- Don't mock what you don't own without an adapter. If you need to mock
  `fetch`, create a loader interface and mock the interface.

---

## 5. Translation-feature-specific rules

These protect the _product_, not just code quality:

### 5.1 The translator contract

- **Translators never see HTML.** If a feature would put HTML in a translation
  file, it's the wrong feature. Find a different design.
- **Translator-supplied strings are never inserted as HTML.** They become text
  nodes or template context. The `innerHTML` setter is **forbidden** for
  translator content. CI greps for `innerHTML` in `packages/linguo/src` and
  fails the build.
- BBCode placeholders are `[name]...[/name]` with `name` matching
  `[a-zA-Z_][a-zA-Z0-9_-]*`. This grammar is part of the public contract;
  changing it is a major version bump.

### 5.2 Extraction parity

- The runtime normalizer (source → BBCode key) and the extractor normalizer
  **must produce identical output** for the same input. There is a shared
  test fixture (`tests/fixtures/normalization-cases.json`) consumed by both
  test suites. When you add a normalization rule to one side, you add the
  case to the fixture in the same commit.

### 5.3 Backward compatibility

- The JSON file format (keys + string values, ICU-compatible) is stable from
  v1. Do not introduce a custom format. Translators use existing tooling
  (Crowdin, Lokalise, Phrase); we meet them where they are.
- Adding new optional fields is OK. Renaming or removing fields requires a
  migration script in `packages/linguo/migrations/`.

### 5.4 Loading & lifecycle

- The `TranslateStore` exposes an `isReady` signal. Consumers gate UI on it
  if they need flash-of-untranslated-content prevention. The directive itself
  reads through to this signal — once a translation is loaded, the directive
  re-renders automatically without any subscription bookkeeping.
- The store does **not** start loading automatically. Bootstrap is explicit:
  `provideTranslate({ defaultLang: 'en', loader: ... })`. This avoids the
  surprise of HTTP fired during DI initialization.

---

## 6. Workflow rules for Claude

### 6.1 Before writing code

- Read the relevant existing files first. Do not invent APIs that conflict
  with what's already there.
- For a new feature: skim `packages/linguo/src/index.ts` to understand the
  current public surface before adding to it.
- For anything touching the store: read `packages/linguo/src/translate.store.ts`
  and the relevant `with-*.ts` features before adding code.
- If a task involves the parser, normalizer, or BBCode grammar, read
  `packages/linguo/src/bbcode-parser.ts` and its tests before touching anything.

### 6.2 Before committing

- `pnpm nx affected -t lint test build` passes.
- Public API changes have a changeset (`pnpm changeset`).
- New public symbols (including new store signals and methods) have TSDoc.
- Tests cover the change.
- The PR description explains _why_, not just _what_.

### 6.3 Things Claude must never do in this repo

- **Never add a runtime dependency without justifying it in the PR.** Every
  dep is supply-chain risk and bundle size. The bar is "we cannot reasonably
  build this ourselves" — not "this saves 30 minutes."
- **Never promote `@ngrx/signals` from peer to regular dependency.** It stays
  in `peerDependencies` so consumers control the version.
- **Never use `lodash`, `moment`, or `rxjs/operators` deep imports.** Use
  native JS, Temporal (when available), and `rxjs` top-level imports.
- **Never add a polyfill.** If a feature needs a polyfill, it's not ready.
- **Never write code that depends on `zone.js`.** This library must be
  zoneless-compatible. Reactivity comes from signals.
- **Never call `document.*` directly in `core`.** Use Angular's `Renderer2` or
  `DOCUMENT` token. SSR must work.
- **Never use `eval`, `Function` constructor, or `innerHTML` for any
  user/translator content.** XSS surface is zero by construction.
- **Never write a service class (`@Injectable()` with mutable state) where a
  SignalStore would do.** SignalStore is the default; classes are the exception
  and need justification in TSDoc.
- **Never expose `Subject`, `BehaviorSubject`, or `Observable` from the
  store's public API.** Signals out, methods in.
- **Never reach into another store's internal state.** Stores communicate via
  their public surface or via injected dependencies.
- **Never write code that assumes the browser locale.** Locale is always
  explicit, sourced from configuration.
- **Never modify a generated file by hand** (`*.d.ts` outputs, `dist/`,
  lockfiles via text editing). Regenerate.
- **Never disable ESLint rules inline without a comment explaining why and a
  referenced issue.**
- **Never commit `.only` or `.skip` in tests.**
- **Never push directly to `main`.** All changes go through PR.
- **Never write a "fix it later" branch.** Either fix it now or open an issue
  and link it from the code.

### 6.4 When to ask vs. proceed

Claude should **stop and ask** before:

- Renaming a public symbol (including store signals/methods).
- Adding a new public method or signal to `TranslateStore`.
- Adding a new package to the monorepo.
- Introducing a new runtime dependency.
- Changing the BBCode grammar or JSON file format.
- Touching anything in `packages/linguo/src/bbcode-parser.ts`.
- Changing the SignalStore's shape (state, methods, features composition).
- Changing CI configuration.

Claude should **proceed without asking** for:

- Implementation details inside a single file.
- Adding tests.
- Refactors that don't change behavior or public API.
- Documentation improvements.
- Internal helper functions in non-exported modules.
- New private SignalStore features that aren't re-exported.

---

## 7. Documentation

- Public API docs are generated from TSDoc. If a TSDoc comment is wrong, the
  published docs are wrong.
- The `README.md` of each package is the npm landing page. Treat it as
  marketing copy: lead with the value, not the install command.
- Migration guides live in `docs/migrations/`. Every major version has one.
- The migration guide from `ngx-translate` and from Transloco is part of v1.0
  documentation, not an afterthought.

---

## 8. Release process

- Versioning: semver, strict. Patch = bug fix, minor = additive, major =
  breaking.
- All packages in this repo version together. If `@ng-linguo/linguo` goes to 2.0,
  all `@ng-linguo/*` packages go to 2.0 the same day, even if their own code
  didn't break. This is a feature, not a bug — it makes peer-dep ranges trivial.
- Releases happen from a `release/*` branch, merged to `main` after publish.
- Changelogs are generated by Changesets. Do not edit them by hand.

---

## 9. Open questions (resolve before v1.0)

These are decisions deferred from initial design. Claude should not silently
pick one — bring them up if a task touches them:

- ICU MessageFormat support: full integration in `@ng-linguo/linguo/icu` or interop
  with a separate lib?
- Type-safe key generation: codegen approach (`.d.ts` from JSON), template
  literal types, or neither?
- Lazy scopes: feature-store composition (`signalStoreFeature` per scope)
  vs. explicit `loadScope()` calls vs. route-data based?
- Server-side rendering: transfer-state integration in core or in a separate
  `@ng-linguo/ssr` package?
- Multiple concurrent languages (e.g. admin UI in English while previewing
  content in Polish): one store with namespaces, or multiple store instances?

---

_This file is the contract. If you find yourself wanting to violate a rule,
the answer is to open an issue proposing a change to this file — not to
quietly violate it in a PR._
