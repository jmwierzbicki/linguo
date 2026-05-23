import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
  findConfigFile,
  parseConfig,
  serializeConfig,
} from './config';

describe('parseConfig', () => {
  it('parses a full config', () => {
    const config = parseConfig(
      JSON.stringify({
        locales: ['en', 'pl', 'de'],
        sourceLocale: 'en',
        src: 'app/src',
        catalogs: 'app/i18n',
        output: 'app/src/assets/i18n',
        referenceBase: 'workspace',
      }),
    );
    expect(config).toEqual({
      locales: ['en', 'pl', 'de'],
      sourceLocale: 'en',
      src: 'app/src',
      catalogs: 'app/i18n',
      output: 'app/src/assets/i18n',
      referenceBase: 'workspace',
    });
  });

  it('applies defaults for omitted fields', () => {
    const config = parseConfig(JSON.stringify({ locales: ['en'] }));
    expect(config).toEqual({ locales: ['en'], ...DEFAULT_CONFIG });
  });

  it('accepts a referenceBase of workspace', () => {
    expect(parseConfig(JSON.stringify({ locales: ['en'], referenceBase: 'workspace' }))).toEqual({
      locales: ['en'],
      ...DEFAULT_CONFIG,
      referenceBase: 'workspace',
    });
  });

  it('throws on an invalid referenceBase', () => {
    expect(() => parseConfig(JSON.stringify({ locales: ['en'], referenceBase: 'nope' }))).toThrow(
      /referenceBase/,
    );
  });

  it('throws when locales is missing or empty', () => {
    expect(() => parseConfig(JSON.stringify({}))).toThrow(/locales/);
    expect(() => parseConfig(JSON.stringify({ locales: [] }))).toThrow(/locales/);
  });

  it('throws when a locale is not a string', () => {
    expect(() => parseConfig(JSON.stringify({ locales: ['en', 7] }))).toThrow(/string/);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseConfig('{ not json')).toThrow(/JSON/);
  });
});

describe('serializeConfig', () => {
  it('round-trips through parseConfig', () => {
    const config = {
      locales: ['en', 'pl', 'de'],
      sourceLocale: 'en',
      src: 'app/src',
      catalogs: 'i18n',
      output: 'public/i18n',
      referenceBase: 'workspace' as const,
    };
    expect(parseConfig(serializeConfig(config))).toEqual(config);
  });

  it('writes pretty JSON with a trailing newline', () => {
    const text = serializeConfig({ locales: ['en'], ...DEFAULT_CONFIG });
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toContain('\n  "locales": [');
  });
});

describe('findConfigFile', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'linguo-cfg-'));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const touch = (...segments: string[]): string => {
    const path = join(root, ...segments);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, '{ "locales": ["en"] }');
    return path;
  };

  it('finds a config in an ancestor directory (upward search)', () => {
    const config = touch(CONFIG_FILENAME);
    const deep = join(root, 'apps', 'web', 'src');
    mkdirSync(deep, { recursive: true });
    expect(findConfigFile(deep)).toBe(config);
  });

  it('finds a single config in a descendant directory (downward search)', () => {
    const config = touch('apps', 'playground', CONFIG_FILENAME);
    expect(findConfigFile(root)).toBe(config);
  });

  it('throws when the downward search is ambiguous', () => {
    touch('apps', 'a', CONFIG_FILENAME);
    touch('apps', 'b', CONFIG_FILENAME);
    expect(() => findConfigFile(root)).toThrow(/found 2 .*Pass --config/s);
  });

  it('returns undefined when no config exists anywhere', () => {
    mkdirSync(join(root, 'src'), { recursive: true });
    expect(findConfigFile(join(root, 'src'))).toBeUndefined();
  });

  it('ignores configs nested in skipped directories like node_modules', () => {
    touch('node_modules', 'pkg', CONFIG_FILENAME);
    expect(findConfigFile(root)).toBeUndefined();
  });
});
