import { configs, meta, rules } from './plugin';

describe('eslint-plugin', () => {
  it('identifies itself with the published package name', () => {
    expect(meta.name).toBe('@ng-linguo/eslint-plugin');
  });

  it('exposes no rules until the first one is implemented', () => {
    expect(Object.keys(rules)).toHaveLength(0);
  });
});

describe('configs.recommended', () => {
  const rule = '@angular-eslint/template/elements-content';

  it('configures the elements-content rule to safelist the t attribute', () => {
    // The whole point: `t` joins the rule's safelist so the directive's
    // runtime-supplied content is treated as content. If this option drifts,
    // empty `[t]` headings start failing a consumer's lint again.
    expect(configs.recommended.rules[rule]).toEqual(['error', { allowList: ['t'] }]);
  });

  it('keeps the rule at error severity rather than disabling it', () => {
    // Suppressing the rule entirely would lose the a11y check for every other
    // empty heading/anchor/button — we narrow it, we don't switch it off.
    const [severity] = configs.recommended.rules[rule] as [string, unknown];
    expect(severity).toBe('error');
  });

  it('scopes itself to HTML templates', () => {
    expect(configs.recommended.files).toEqual(['**/*.html']);
  });

  it('carries a stable name for ESLint config inspection', () => {
    expect(configs.recommended.name).toBe('@ng-linguo/eslint-plugin/recommended');
  });
});
