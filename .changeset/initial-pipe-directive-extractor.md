---
'@ng-linguo/core': minor
'@ng-linguo/extract': minor
'@ng-linguo/loader-http': minor
---

Add the translation rendering and extraction pipeline:

- **core**: `TranslatePipe` (`| translate`, optional context arg) for plain-text
  translations and the `[translate]` directive (with `translateContext` and
  `[translatePlaceholder]` `ng-template` binding) for BBCode placeholders
  (translators never see HTML). Both react to language changes. Keys are
  normalized to match the extractor. A context disambiguates same-text keys
  (`Play` in a game vs. a music player); lookup falls back to the plain key, then
  to the source.
- **extract**: scan sources for `translate` pipe/directive usage including
  context (`| translate: 'ctx'`, `translateContext="ctx"`), read/write gettext
  `.po` catalogs with `msgctxt` (`parsePo`/`serializePo`), merge preserving
  translations and descriptions (`mergeCatalog`), and compile to the runtime
  `key -> translation` JSON with `contextkey` composite keys
  (`compileEntries`). Includes a `linguo-extract` CLI (`extract` / `compile`).
- **loader-http**: confirmed the compiled JSON loads directly as the runtime
  dictionary, BBCode placeholders preserved.
