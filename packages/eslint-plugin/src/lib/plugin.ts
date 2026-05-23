/**
 * Metadata identifying this ESLint plugin to tooling and config presets.
 */
export const meta = {
  name: '@ng-linguo/eslint-plugin',
  version: '0.0.1',
} as const;

/**
 * Lint rules exposed to consumers, keyed by rule name.
 *
 * No rules ship yet. The first planned rule guards the translator contract
 * (CLAUDE.md §5.1) by flagging translator-supplied strings that would be
 * inserted as HTML.
 */
export const rules: Readonly<Record<string, unknown>> = {};

/**
 * The subset of an ESLint flat-config object this package's presets use. Typed
 * structurally so the plugin needs no `eslint` dependency just to describe its
 * own config shape; it is assignable to ESLint's `Linter.Config`.
 */
interface FlatConfig {
  /** Stable name surfaced by ESLint's config inspector and `--debug` output. */
  readonly name?: string;
  /** Glob(s) the config applies to. */
  readonly files?: readonly string[];
  /** Rule settings, keyed by fully-qualified rule name. */
  readonly rules: Readonly<Record<string, unknown>>;
}

/**
 * Ready-made flat-config presets a consumer can spread into their
 * `eslint.config.mjs`. Spread a preset *after* the `@angular-eslint` template
 * configs so its rule options win.
 *
 * @example
 * ```js
 * import angular from 'angular-eslint';
 * import linguo from '@ng-linguo/eslint-plugin';
 *
 * export default [
 *   ...angular.configs.templateRecommended,
 *   linguo.configs.recommended,
 * ];
 * ```
 */
export const configs: Readonly<Record<'recommended', FlatConfig>> = {
  /**
   * Teaches the accessibility rule `@angular-eslint/template/elements-content`
   * that a `[t]` element gets its text from the directive at runtime, so an
   * empty `<h2 t="Setup"></h2>` is no longer flagged as missing content.
   *
   * The rule already short-circuits on any attribute in its safelist (the
   * defaults include `aria-label`, `title`, `innerHTML`); adding `t` extends
   * that to ng-linguo's directive. The check stays live for every *other*
   * empty heading, anchor, or button — and slot-bearing `[t]` elements pass on
   * their own because their `<ng-template tFor>` child means they are not empty.
   *
   * Scoped to `**\/*.html`; inline-template users should also apply the same
   * rule option to the config block that lints their component `.ts` templates.
   */
  recommended: {
    name: '@ng-linguo/eslint-plugin/recommended',
    files: ['**/*.html'],
    rules: {
      '@angular-eslint/template/elements-content': ['error', { allowList: ['t'] }],
    },
  },
};
