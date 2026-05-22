---
'@ng-linguo/extract': minor
---

Add a guided interactive CLI. Running `linguo-extract` with no command in a
terminal now opens a looping menu (built with `@clack/prompts`, under an artistic
banner — a large gradient block-font wordmark with grass and flowers procedurally
sprouting from the letters (different every run), and a coloured chip per
configured locale) to extract, compile, translate via an LLM, run the full
pipeline, or exit — with a spinner and a per-locale status summary. It discovers
`linguo.config.json` automatically.

The **Translate** flow is end-to-end: it copies a prompt containing only the
_untranslated_ entries to the clipboard, and after you paste the model's reply
back to the clipboard it reads it, merges the translations into the full `.po`
(matched by context + source, ignoring anything still untranslated or
unmatched), and recompiles the runtime JSON automatically.

All actions remain available non-interactively as commands (`extract`,
`compile`, `copyprompt`); the menu only opens when stdin/stdout are a TTY, so
CI, pipes, and scripts are unaffected.

This adds `@clack/prompts` as a runtime dependency of `@ng-linguo/extract` — a
deliberate exception to the zero-dependency rule, since robust interactive TTY
prompts are not worth re-implementing. It is ESM-only, so the package now
compiles with TypeScript `module: nodenext` (still emitting CommonJS) and loads
clack via a dynamic `import()`.
