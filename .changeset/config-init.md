---
'@ng-linguo/extract': minor
---

Create and edit `linguo.config.json` from the CLI.

- New `linguo-extract init` command. In a terminal it opens an interactive form
  (locales, source language, source/catalog/output dirs, reference base) that
  creates a config — or edits the existing one. Non-interactively it accepts
  flags (`--locales en,pl …`, `--source-locale`, `--src`, `--catalogs`, `--out`,
  `--reference-base`, `--force`) for scripted/CI use.
- The guided interactive menu now **offers to create** a config when none is
  found (instead of dead-ending), and gains an **"Edit configuration"** item to
  change settings in place.
- New pure helper `serializeConfig()` round-trips with `parseConfig()`.
