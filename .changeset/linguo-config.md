---
'@ng-linguo/extract': minor
---

Add a `linguo.config.json` config file so consumers define their setup once
instead of repeating CLI flags:

```json
{
  "locales": ["en", "pl", "de"],
  "sourceLocale": "en",
  "src": "src",
  "catalogs": "i18n",
  "output": "src/assets/i18n"
}
```

`linguo-extract extract` and `compile` read it (or `--config <path>`); paths are
resolved relative to the config file. CLI flags still override individual
fields. Exposes `parseConfig`, `DEFAULT_CONFIG`, and the `LinguoConfig` type.

A `referenceBase` option controls how `#:` source references are written:
`'config'` (relative to the config file, gettext-style; default) or
`'workspace'` (relative to where the CLI runs, so paths resolve for terminal
Ctrl+Click and editor tooling).
