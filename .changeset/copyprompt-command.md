---
'@ng-linguo/extract': minor
---

Add a `copyprompt <language>` CLI command that copies a ready-to-send LLM
translation prompt — the full instructions plus the target locale's `.po`
catalog — to the system clipboard:

```sh
linguo-extract copyprompt Polski
```

`<language>` may be a locale code (`pl`), the English name (`Polish`), or the
endonym (`Polski`); it resolves to the matching configured locale and reads
that `<locale>.po`. The bundled prompt teaches the model ng-linguo's concepts
(the `<MISSING TRANSLATION>` marker, `msgctxt` context, slot tags,
and MessageFormat 2 plurals/selection) so it returns a valid `.po` to save
back over the file. Pass `--stdout` to print the prompt instead of copying
(for piping or headless/CI use).

Clipboard access uses the platform's native tool (`clip`/`Set-Clipboard`,
`pbcopy`, `wl-copy`/`xclip`/`xsel`) — no new runtime dependency.
