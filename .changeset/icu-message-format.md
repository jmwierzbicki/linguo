---
'@ng-linguo/icu': minor
'@ng-linguo/extract': minor
---

Add ICU MessageFormat support to `@ng-linguo/icu` (now an Angular library):

- `formatMessage(message, args, { locale, format })` formats a message with
  **MessageFormat 2.0 by default** (`format: 'mf2'`) or classic ICU
  MessageFormat 1 (`format: 'mf1'`). Backed by `messageformat` (MF2) and
  `intl-messageformat` (MF1); compiled messages are memoized; a malformed
  pattern returns the raw message instead of throwing. MF2 bidi isolation is
  disabled for plain, predictable output.
- `IcuPipe` (`| icu: args : format?`) translates a key then formats it,
  reactive to language changes. `provideIcu({ defaultFormat })` sets the default
  syntax (defaults to `'mf2'`). `selectPlural` is unchanged.
- **extract**: the scanner now also recognizes the `icu` pipe, so ICU source
  messages are extracted into catalogs alongside `translate` usages.
