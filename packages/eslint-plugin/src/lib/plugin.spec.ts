import { meta, rules } from './plugin';

describe('eslint-plugin', () => {
  it('identifies itself with the published package name', () => {
    expect(meta.name).toBe('@ng-linguo/eslint-plugin');
  });

  it('exposes no rules until the first one is implemented', () => {
    expect(Object.keys(rules)).toHaveLength(0);
  });
});
