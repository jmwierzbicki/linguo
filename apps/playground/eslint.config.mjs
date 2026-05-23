import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...nx.configs['flat/angular'],
  ...nx.configs['flat/angular-template'],
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    rules: {
      // Mirrors @ng-linguo/eslint-plugin's configs.recommended: a `[t]` element
      // gets its text from the directive at runtime, so an empty `<h2 t="…">`
      // is not missing content. (The workspace package isn't node-resolvable
      // from this .mjs config, so we set the option directly rather than import
      // the preset.)
      '@angular-eslint/template/elements-content': ['error', { allowList: ['t'] }],
    },
  },
];
