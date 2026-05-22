module.exports = {
  displayName: 'linguo',
  preset: '../../jest.preset.js',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/packages/linguo',
  // Resolve cross-entry-point imports (the icu/http sources import the primary
  // by its package name) back to source during tests.
  moduleNameMapper: {
    '^@ng-linguo/linguo/icu$': '<rootDir>/icu/src/index.ts',
    '^@ng-linguo/linguo/http$': '<rootDir>/http/src/index.ts',
    '^@ng-linguo/linguo$': '<rootDir>/src/index.ts',
  },
  transform: {
    '^.+\\.(ts|mjs|js|html)$': [
      'jest-preset-angular',
      {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        stringifyContentPathRegex: '\\.(html|svg)$',
      },
    ],
  },
  // intl-messageformat and messageformat (and their @formatjs/@messageformat
  // deps) ship ESM, so they must be transformed rather than ignored.
  transformIgnorePatterns: [
    'node_modules/(?!.*\\.mjs$|.*(?:messageformat|@formatjs|@messageformat))',
  ],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/no-ng-attributes',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/html-comment',
  ],
};
