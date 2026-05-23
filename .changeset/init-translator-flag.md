---
'@ng-linguo/extract': minor
---

`linguo-extract init` now accepts `--translator <module>`, so the
non-interactive (scriptable/CI) `init` can set every `linguo.config.json` field
the interactive editor already could. Previously `--translator` was silently
dropped when creating a config from flags. A blank value is omitted (the
clipboard flow), matching the interactive form.

```bash
linguo-extract init --locales en,pl --translator ./linguo.translator.mjs
```
