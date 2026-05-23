---
'@ng-linguo/linguo': minor
'@ng-linguo/extract': minor
---

Let `mark()` carry a `context`, so messages defined outside a template (ICU
patterns in a component field, label constants read through a variable) can be
disambiguated and annotated for translators — not just inline pipe/directive
messages.

```ts
readonly files = mark(
  '.input {$count :number} .match $count one {{{$count} file}} * {{{$count} files}}',
  { context: 'file = a document on disk' },
);
```

The extractor now reads the options object on `mark('…', { context })` (mirroring
the `t` pipe and `t()` call) and records it as the entry's `msgctxt`. `mark()`
remains a runtime no-op. Because context is part of the key, the same `context`
must be passed where the marked string is rendered (`| t: { context }` or
`tContext`) for the contextual entry to resolve at runtime.
