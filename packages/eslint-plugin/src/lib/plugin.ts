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
