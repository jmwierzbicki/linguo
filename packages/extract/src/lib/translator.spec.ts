import { serializePo, type PoEntry } from './po';
import {
  autoTranslateCatalog,
  loadTranslator,
  resolveTranslatorExport,
  type TranslateFunction,
} from './translator';

const fn: TranslateFunction = () => '';

describe('resolveTranslatorExport', () => {
  it('returns a named "translate" export', () => {
    expect(resolveTranslatorExport({ translate: fn })).toBe(fn);
  });

  it('returns a default function export', () => {
    expect(resolveTranslatorExport({ default: fn })).toBe(fn);
  });

  it('returns translate from a default object export', () => {
    expect(resolveTranslatorExport({ default: { translate: fn } })).toBe(fn);
  });

  it('throws when the module exports no usable function', () => {
    expect(() => resolveTranslatorExport({})).toThrow(/must export a "translate" function/);
  });

  it('throws when translate is not a function', () => {
    expect(() => resolveTranslatorExport({ translate: 'nope' }, 'my-module')).toThrow(/my-module/);
  });
});

describe('loadTranslator', () => {
  it('imports the module by file URL and resolves its translate export', async () => {
    let seen = '';
    const translate = await loadTranslator('/abs/translator.mjs', (specifier) => {
      seen = specifier;
      return Promise.resolve({ translate: fn });
    });
    expect(translate).toBe(fn);
    expect(seen).toMatch(/^file:\/\//);
  });

  it('wraps an import failure with the module path', async () => {
    await expect(
      loadTranslator('/abs/missing.mjs', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow(/could not load translator module at .*missing\.mjs: boom/);
  });
});

describe('autoTranslateCatalog', () => {
  const entry = (msgid: string, msgstr: string, context = ''): PoEntry => ({
    context,
    msgid,
    msgstr,
    references: [],
  });

  it('sends only untranslated entries and merges the reply', async () => {
    const poText = serializePo([entry('Play', ''), entry('Play', '', 'game')]);
    const reply = serializePo([entry('Play', 'Graj'), entry('Play', 'Zagraj', 'game')]);

    const calls: string[] = [];
    const outcome = await autoTranslateCatalog({
      translate: ({ prompt, targetLabel }) => {
        calls.push(targetLabel);
        // The prompt carries the entries to translate.
        expect(prompt).toContain('Play');
        return reply;
      },
      poText,
      targetLocale: 'pl',
      targetLabel: 'Polish (pl)',
      sourceLocale: 'en',
    });

    expect(calls).toEqual(['Polish (pl)']);
    expect(outcome).toMatchObject({ untranslated: 2, applied: 2, remaining: 0 });
    expect(outcome.po).toContain('Graj');
    expect(outcome.po).toContain('Zagraj');
  });

  it('skips the translator when the catalog is already complete', async () => {
    const poText = serializePo([entry('Play', 'Graj')]);
    let called = false;
    const outcome = await autoTranslateCatalog({
      translate: () => {
        called = true;
        return '';
      },
      poText,
      targetLocale: 'pl',
      targetLabel: 'Polish (pl)',
      sourceLocale: 'en',
    });
    expect(called).toBe(false);
    expect(outcome).toMatchObject({ untranslated: 0, applied: 0, remaining: 0 });
  });

  it('throws when the translator returns an empty reply', async () => {
    const poText = serializePo([entry('Play', '')]);
    await expect(
      autoTranslateCatalog({
        translate: () => '   ',
        poText,
        targetLocale: 'pl',
        targetLabel: 'Polish (pl)',
        sourceLocale: 'en',
      }),
    ).rejects.toThrow(/empty reply for Polish \(pl\)/);
  });
});
