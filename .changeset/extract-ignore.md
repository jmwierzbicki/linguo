---
'@ng-linguo/extract': minor
---

Add `linguo-ignore` comment directives to exclude regions from extraction.

Scanning is regex-based over source, so a string that looks like a message
(`mark(`, `'…' | t`, `t="…"`) is extracted as one — even inside a documentation
sample or a fixture, which produced junk catalog entries and stray `#:`
references. Wrap such regions to skip them; the directives are matched as plain
text, so they work in `//`, `/* */`, and `<!-- -->` comments alike:

- `linguo-ignore-start` … `linguo-ignore-end` — skip everything between them
  (an unmatched `start` skips to end of file).
- `linguo-ignore-next-line` — skip the single line after the directive.
- `linguo-ignore-file` — skip the whole file.
