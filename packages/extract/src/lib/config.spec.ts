import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  buildInitConfig,
  CONFIG_FILENAME,
  CONFIG_SCHEMA_REF,
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

  it('parses an optional translator module path', () => {
    const config = parseConfig(
      JSON.stringify({ locales: ['en'], translator: './linguo.translator.mjs' }),
    );
    expect(config.translator).toBe('./linguo.translator.mjs');
  });

  it('omits the translator key when it is absent or blank', () => {
    expect('translator' in parseConfig(JSON.stringify({ locales: ['en'] }))).toBe(false);
    expect('translator' in parseConfig(JSON.stringify({ locales: ['en'], translator: '' }))).toBe(
      false,
    );
  });

  it('throws when translator is not a string', () => {
    expect(() => parseConfig(JSON.stringify({ locales: ['en'], translator: 7 }))).toThrow(
      /translator/,
    );
  });

  it('preserves a $schema reference', () => {
    const config = parseConfig(JSON.stringify({ $schema: './schema.json', locales: ['en'] }));
    expect(config.$schema).toBe('./schema.json');
  });

  it('throws when $schema is not a string', () => {
    expect(() => parseConfig(JSON.stringify({ locales: ['en'], $schema: 7 }))).toThrow(/\$schema/);
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

  it('round-trips a translator path and omits it when unset', () => {
    const withTranslator = {
      locales: ['en'],
      ...DEFAULT_CONFIG,
      translator: './linguo.translator.mjs',
    };
    expect(parseConfig(serializeConfig(withTranslator))).toEqual(withTranslator);
    expect(serializeConfig({ locales: ['en'], ...DEFAULT_CONFIG })).not.toContain('translator');
  });

  it('emits $schema first so editors pick it up, and round-trips it', () => {
    const withSchema = { $schema: './s.json', locales: ['en'], ...DEFAULT_CONFIG };
    const text = serializeConfig(withSchema);
    expect(text.indexOf('"$schema"')).toBeLessThan(text.indexOf('"locales"'));
    expect(parseConfig(text)).toEqual(withSchema);
  });
});

describe('buildInitConfig', () => {
  it('applies defaults and the schema reference for omitted fields', () => {
    expect(buildInitConfig({ locales: ['en', 'pl'] })).toEqual({
      $schema: CONFIG_SCHEMA_REF,
      locales: ['en', 'pl'],
      sourceLocale: DEFAULT_CONFIG.sourceLocale,
      src: DEFAULT_CONFIG.src,
      catalogs: DEFAULT_CONFIG.catalogs,
      output: DEFAULT_CONFIG.output,
      referenceBase: DEFAULT_CONFIG.referenceBase,
    });
  });

  it('carries every provided field, including the translator', () => {
    expect(
      buildInitConfig({
        locales: ['en', 'de'],
        sourceLocale: 'de',
        src: 'app',
        catalogs: 'locales',
        output: 'public/i18n',
        referenceBase: 'workspace',
        translator: './t.mjs',
      }),
    ).toEqual({
      $schema: CONFIG_SCHEMA_REF,
      locales: ['en', 'de'],
      sourceLocale: 'de',
      src: 'app',
      catalogs: 'locales',
      output: 'public/i18n',
      referenceBase: 'workspace',
      translator: './t.mjs',
    });
  });

  it('omits a blank or whitespace-only translator (clipboard flow)', () => {
    expect(buildInitConfig({ locales: ['en'], translator: '   ' })).not.toHaveProperty(
      'translator',
    );
    expect(buildInitConfig({ locales: ['en'], translator: undefined })).not.toHaveProperty(
      'translator',
    );
  });

  it('trims a provided translator path', () => {
    expect(buildInitConfig({ locales: ['en'], translator: '  ./t.mjs  ' }).translator).toBe(
      './t.mjs',
    );
  });

  it('round-trips through serializeConfig/parseConfig with the translator intact', () => {
    const config = buildInitConfig({ locales: ['en', 'pl'], translator: './t.mjs' });
    expect(parseConfig(serializeConfig(config)).translator).toBe('./t.mjs');
  });
});

describe('linguo.config.schema.json', () => {
  const schema = JSON.parse(
    readFileSync(join(__dirname, '../../schema/linguo.config.schema.json'), 'utf8'),
  ) as {
    required: string[];
    additionalProperties: boolean;
    properties: Record<string, { default?: unknown; enum?: unknown }>;
  };

  it('stays in sync with the config shape (no drift between schema and code)', () => {
    expect(Object.keys(schema.properties).sort()).toEqual(
      [
        '$schema',
        'locales',
        'sourceLocale',
        'src',
        'catalogs',
        'output',
        'referenceBase',
        'translator',
      ].sort(),
    );
    expect(schema.required).toEqual(['locales']);
    expect(schema.additionalProperties).toBe(false);
  });

  it('documents the same defaults the code applies', () => {
    expect(schema.properties['sourceLocale']?.default).toBe(DEFAULT_CONFIG.sourceLocale);
    expect(schema.properties['src']?.default).toBe(DEFAULT_CONFIG.src);
    expect(schema.properties['catalogs']?.default).toBe(DEFAULT_CONFIG.catalogs);
    expect(schema.properties['output']?.default).toBe(DEFAULT_CONFIG.output);
    expect(schema.properties['referenceBase']?.default).toBe(DEFAULT_CONFIG.referenceBase);
    expect(schema.properties['referenceBase']?.enum).toEqual(['config', 'workspace']);
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
