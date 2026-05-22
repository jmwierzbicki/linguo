# @ng-linguo/linguo

A modern, complete i18n toolkit for Angular 21+, built on SignalStore.

```ts
import { provideTranslate } from '@ng-linguo/linguo';
import { provideIcu } from '@ng-linguo/linguo/icu';
import { createHttpLoader } from '@ng-linguo/linguo/http';
```

- **`@ng-linguo/linguo`** — the runtime: `TranslateStore`, the `t` pipe, the
  `[t]` directive, `injectTranslate`, BBCode placeholders.
- **`@ng-linguo/linguo/icu`** — ICU MessageFormat (MF1 + MF2) via `provideIcu`.
- **`@ng-linguo/linguo/http`** — an HTTP `TranslationLoader` (`createHttpLoader`).

The build-time extraction CLI lives in the separate `@ng-linguo/extract`
package (pure Node, no Angular dependency).
