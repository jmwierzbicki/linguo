---
'@ng-linguo/extract': minor
---

Automatic AI translation via a consumer-supplied function.

- New optional `translator` config field: a path to a module exporting a
  `translate` function (or a default function). ng-linguo builds the prompt and
  merges the reply; the consumer's function only calls their AI provider and
  returns its answer, keeping every SDK and API secret on their side.
- New `linguo-extract translate --locale <code>` / `--all` command translates
  missing entries headlessly (CI / npm scripts), then compiles.
- In the interactive menu, "Translate" now offers **Automatic** (call your
  translator) alongside the manual clipboard flow when a `translator` is set.
- The BIOS-style config editor gains the `translator` field and now shows a
  one-line **description** for every setting as you drill into it.
- New pure helpers `autoTranslateCatalog()`, `loadTranslator()`, and
  `resolveTranslatorExport()`.
