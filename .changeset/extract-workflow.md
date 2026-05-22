---
'@ng-linguo/extract': minor
---

Improve the extraction workflow:

- Catalog entries are kept in **order of discovery** (files in order, and by
  source position within a file) instead of sorted alphabetically.
- Newly discovered entries are **seeded**: the source locale (default `en`) gets
  the source text, other locales get `"<MISSING TRANSLATION> <source>"` so
  untranslated strings render visibly flagged with an English fallback until
  translated. Existing translations are preserved on re-extraction.
- `extractToCatalogs` returns per-language stats (total / added / removed /
  missing) and the `linguo-extract extract` CLI prints them. A `--source-locale`
  flag selects which locale is treated as the source.
