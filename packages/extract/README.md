# @ng-linguo/extract

The build-time CLI for [ng-linguo](https://github.com/jmwierzbicki/linguo). Pure
Node — it has **zero Angular/RxJS dependencies** — so installing it never drags
the framework into your tooling. It scans your source for translatable strings,
maintains gettext `.po` catalogs, and compiles them to the runtime `.json`
dictionaries `@ng-linguo/linguo` loads.

```bash
pnpm add -D @ng-linguo/extract
```

## Quick start

```bash
# Create linguo.config.json (interactive in a terminal, or pass flags for CI)
linguo-extract init --locales en,pl,de

# Scan source → update <locale>.po catalogs
linguo-extract extract

# Compile <locale>.po → runtime <locale>.json
linguo-extract compile
```

Run `linguo-extract` with no command in a terminal to open the guided menu,
which can also create and edit your config (a BIOS-style settings screen where
each value carries a description).

## Configuration

`linguo.config.json`, discovered automatically by searching up from the cwd and
then down through the workspace. A JSON Schema ships with the package — add a
`$schema` (the `init` command writes it for you) for editor autocomplete, hover
docs, and validation:

```json
{
  "$schema": "./node_modules/@ng-linguo/extract/linguo.config.schema.json",
  "locales": ["en", "pl", "de"]
}
```

| Field           | Description                                                         |
| --------------- | ------------------------------------------------------------------- |
| `locales`       | Languages you ship. Comma-separated BCP-47 codes.                   |
| `sourceLocale`  | The language your source strings are authored in.                   |
| `src`           | Directory scanned for translatable strings.                         |
| `catalogs`      | Where the editable `<locale>.po` catalogs live.                     |
| `output`        | Where compiled runtime `<locale>.json` dictionaries are written.    |
| `referenceBase` | `#:` references relative to the config file (`config`) or the cwd.  |
| `translator`    | Optional module path enabling automatic AI translation (see below). |

## Excluding code from extraction

Scanning is regex-based over your source, so a string that _looks_ like a message
is one — even inside a documentation sample or a fixture. Wrap such regions in
`linguo-ignore` comment directives and the scanner skips them. They are matched
as plain text, so the comment style (`//`, `/* */`, `<!-- -->`) doesn't matter:

```ts
// linguo-ignore-start
const sample = `<p t="This is documentation, not a real message"></p>`;
const icu = mark('.input {$n :number} .match $n one {{…}} * {{…}}');
// linguo-ignore-end
```

| Directive                                   | Effect                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `linguo-ignore-start` / `linguo-ignore-end` | Skip everything between them (an unmatched `start` skips to end of file). |
| `linguo-ignore-next-line`                   | Skip the single line after the directive.                                 |
| `linguo-ignore-file`                        | Skip the whole file, wherever the marker appears.                         |

## Translating with an LLM

Every untranslated entry is seeded with the source text behind a
`<MISSING TRANSLATION>` marker. ng-linguo builds a single, self-contained prompt
that teaches the model your concepts — `msgctxt`, slot tags (`[name]…[/name]`),
and MessageFormat 2 plural/selection rules — so the result is high quality.

There are two ways to run it, and **the clipboard method is always available** —
including inside the interactive menu — whether or not you configure a translator.

### Manual — clipboard (no API key, no config)

```bash
linguo-extract copyprompt pl   # copies the prompt to your clipboard
```

Paste it into any chat model, then save the reply over `pl.po`. Or use the
interactive menu: **Translate → Manual** copies the prompt, you paste the model's
reply back to your clipboard, and ng-linguo merges it into the catalog for you.
(When no `translator` is configured, "Translate" goes straight to this flow.)

### Automatic — your translator function

Because every AI provider has a different SDK and secret handling, **you** supply
the API call. Point `translator` at a module that exports a `translate` function;
ng-linguo builds the prompt and merges the reply, and your function does nothing
but send the prompt to your provider and return its answer.

The function receives a request object and returns the model's reply (the
translated `.po` text) — synchronously or as a `Promise`:

| Field          | Type     | Description                               |
| -------------- | -------- | ----------------------------------------- |
| `prompt`       | `string` | The ready-to-send prompt for one catalog. |
| `targetLocale` | `string` | The catalog's locale code, e.g. `"pl"`.   |
| `targetLabel`  | `string` | A readable label, e.g. `"Polish (pl)"`.   |
| `sourceLocale` | `string` | The source locale, e.g. `"en"`.           |

A complete, copy-pasteable implementation (OpenAI):

```js
// linguo.translator.mjs
import OpenAI from 'openai';

const client = new OpenAI(); // reads OPENAI_API_KEY from the environment

/**
 * @param {{ prompt: string, targetLocale: string, targetLabel: string, sourceLocale: string }} req
 * @returns {Promise<string>} the model's reply — a complete .po block
 */
export async function translate(req) {
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0, // deterministic catalogs
    messages: [{ role: 'user', content: req.prompt }],
  });
  const reply = res.choices[0]?.message?.content;
  if (!reply) {
    throw new Error(`Empty reply translating ${req.targetLabel}`);
  }
  return reply;
}
```

The same shape works for any provider — only the request/response wiring changes.
Anthropic, for example:

```js
// linguo.translator.mjs
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

export async function translate({ prompt, targetLabel }) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content.find((b) => b.type === 'text');
  if (!block) throw new Error(`Empty reply translating ${targetLabel}`);
  return block.text;
}
```

> A TypeScript module works too (`./linguo.translator.ts` via a loader like
> `tsx`/`ts-node`); import the `TranslateFunction` type from `@ng-linguo/extract`
> to type-check the signature. The export may also be the module's `default`.

Then link it and run:

```json
{ "locales": ["en", "pl", "de"], "translator": "./linguo.translator.mjs" }
```

```bash
linguo-extract translate --locale pl   # one language
linguo-extract translate --all         # every language with missing entries
```

`translate` only touches entries that are still missing, then compiles. The same
function powers the **Automatic** option in the interactive menu (which still
offers **Manual** clipboard alongside it). Your provider, your model, your
secrets — never ours.
