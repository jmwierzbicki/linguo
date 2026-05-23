---
'@ng-linguo/extract': minor
---

Ship a JSON Schema for `linguo.config.json`.

- The package now bundles `linguo.config.schema.json`. Reference it with a
  `$schema` key for editor autocomplete, inline docs, and validation:
  `"$schema": "./node_modules/@ng-linguo/extract/linguo.config.schema.json"`.
- `linguo-extract init` (and config edits in the interactive menu) now stamp a
  `$schema` automatically, and the CLI preserves an existing one across edits.
- `parseConfig`/`serializeConfig` round-trip `$schema` (emitted first). The
  schema is kept in sync with the config defaults by a parity test.
