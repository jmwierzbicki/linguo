---
'@ng-linguo/extract': minor
---

Auto-discover `linguo.config.json` when `--config` is omitted. The CLI now
searches upward from the current directory (so any command works from anywhere
inside a project), and if nothing is found, downward through the workspace — so
running from a monorepo root locates a single project config without a flag. An
ambiguous downward match (more than one config) errors and asks for `--config`.
