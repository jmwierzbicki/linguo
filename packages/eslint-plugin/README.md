# @ng-linguo/eslint-plugin

ESLint configuration for [ng-linguo](https://www.npmjs.com/package/@ng-linguo/linguo)
projects. It keeps the linter from fighting the `[t]` directive while leaving
Angular's accessibility checks intact.

## Why you want it

Angular's recommended template rules include
`@angular-eslint/template/elements-content`, an accessibility rule that flags
empty headings, anchors, and buttons:

```html
<h2 t="Setup"></h2>
<!--  ^ <h2> should have content  (@angular-eslint/template/elements-content) -->
```

That heading isn't really empty — the `[t]` directive fills its text at runtime.
The rule can't see that, so a brand-new ng-linguo app lights up with errors on
its first translated heading. This plugin teaches the rule that a `t` attribute
means "content arrives at runtime", exactly as it already trusts `aria-label`,
`title`, and `innerHTML`.

## Install

```bash
pnpm add -D @ng-linguo/eslint-plugin
```

`@angular-eslint` is a peer dependency — you already have it in any Angular
project linted with `angular-eslint`.

## Configuration

Pick whichever fits your setup. They all do the same thing; the preset is just
the least to type and the easiest to keep in sync.

### 1. The preset (recommended)

Spread `configs.recommended` into your flat config, **after** the
`@angular-eslint` template configs so its options win:

```js
// eslint.config.mjs
import angular from 'angular-eslint';
import linguo from '@ng-linguo/eslint-plugin';

export default [
  ...angular.configs.templateRecommended,
  linguo.configs.recommended, // sets allowList: ['t'] on elements-content
];
```

The preset is scoped to `**/*.html`. If your components use **inline templates**
(`template:` in the `@Component`), also apply the rule option to the config
block that lints those — see method 2.

### 2. The rule option, by hand

If you'd rather not add a dependency, set the option directly. The `allowList`
extends the rule's built-in safelist, so list `t` alongside any attributes you
already allow:

```js
// eslint.config.mjs (flat config)
{
  files: ['**/*.html'],
  rules: {
    '@angular-eslint/template/elements-content': ['error', { allowList: ['t'] }],
  },
}
```

```jsonc
// .eslintrc.json (legacy config)
{
  "overrides": [
    {
      "files": ["*.html"],
      "rules": {
        "@angular-eslint/template/elements-content": ["error", { "allowList": ["t"] }],
      },
    },
  ],
}
```

This narrows the rule — it does **not** disable it. Every other empty heading,
anchor, or button is still reported.

### 3. No config — the static-fallback pattern

You can sidestep the rule entirely by giving the element its source text as
static content. The directive strips it on init and renders the translation:

```html
<h2 t="Setup">Setup</h2>
```

This is more than a lint workaround: the static text is shown before the
dictionary loads (and on the server, for SSR), so it doubles as a no-flash
fallback. Use it where that fallback is worth the duplicated source string;
use a method above where it isn't (e.g. opaque keys like `t="setup.heading"`).

## Slot-bearing elements need nothing

A `[t]` element with `[name]…[/name]` slots has `<ng-template tFor>` children, so
it isn't empty and the rule never fires regardless of configuration:

```html
<h2 t="The [code][/code] pipe">
  <ng-template tFor="code"><code>t</code></ng-template>
</h2>
```

## Roadmap

The first custom rule will guard the translator contract (CLAUDE.md §5.1) by
flagging translator-supplied strings that would be inserted as HTML. Until then
this package ships configuration only — `rules` is intentionally empty.
