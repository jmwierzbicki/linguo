import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MISSING_PREFIX, compileCatalogs, extractToCatalogs } from './runner';

describe('extract/compile runner', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'linguo-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('seeds new entries: source text for the source locale, a flagged fallback otherwise', () => {
    const src = join(root, 'src');
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, 'a.html'), `{{ 'Play' | t }}`);
    const out = join(root, 'i18n');

    extractToCatalogs({ srcDir: src, outDir: out, locales: ['en', 'pl'], cwd: root });

    expect(readFileSync(join(out, 'en.po'), 'utf8')).toContain('msgid "Play"\nmsgstr "Play"');
    expect(readFileSync(join(out, 'pl.po'), 'utf8')).toContain(
      `msgid "Play"\nmsgstr "${MISSING_PREFIX} Play"`,
    );
  });

  it('reports per-language extraction stats', () => {
    const src = join(root, 'src');
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, 'a.html'), `{{ 'Play' | t }}{{ 'Stop' | t }}`);

    const stats = extractToCatalogs({
      srcDir: src,
      outDir: join(root, 'i18n'),
      locales: ['en', 'pl'],
      cwd: root,
    });

    expect(stats.messages).toBe(2);
    expect(stats.files).toBe(1);
    expect(stats.locales).toEqual([
      { locale: 'en', total: 2, added: 2, removed: 0, missing: 0 },
      { locale: 'pl', total: 2, added: 2, removed: 0, missing: 2 },
    ]);
  });

  it('preserves translations on re-extract and reports new/removed entries', () => {
    const src = join(root, 'src');
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, 'a.html'), `{{ 'Play' | t }}`);
    const out = join(root, 'i18n');

    extractToCatalogs({ srcDir: src, outDir: out, locales: ['pl'], cwd: root });

    // A translator replaces the flagged fallback with a real translation...
    const plPath = join(out, 'pl.po');
    writeFileSync(
      plPath,
      readFileSync(plPath, 'utf8').replace(
        `msgid "Play"\nmsgstr "${MISSING_PREFIX} Play"`,
        'msgid "Play"\nmsgstr "Odtwarzaj"',
      ),
    );

    // ...then a developer adds a new string and re-extracts.
    writeFileSync(join(src, 'a.html'), `{{ 'Play' | t }}{{ 'Stop' | t }}`);
    const stats = extractToCatalogs({ srcDir: src, outDir: out, locales: ['pl'], cwd: root });

    const plPo = readFileSync(plPath, 'utf8');
    expect(plPo).toContain('msgstr "Odtwarzaj"'); // preserved
    expect(plPo).toContain(`msgid "Stop"\nmsgstr "${MISSING_PREFIX} Stop"`); // added + flagged
    expect(stats.locales).toEqual([{ locale: 'pl', total: 2, added: 1, removed: 0, missing: 1 }]);
  });

  it('compiles .po catalogs into runtime json dictionaries', () => {
    const po = join(root, 'i18n');
    mkdirSync(po, { recursive: true });
    writeFileSync(
      join(po, 'pl.po'),
      [
        'msgid ""',
        'msgstr ""',
        '',
        'msgid "Play"',
        'msgstr "Odtwarzaj"',
        '',
        'msgid "Stop"',
        'msgstr ""',
      ].join('\n'),
    );
    const out = join(root, 'assets');

    compileCatalogs({ poDir: po, outDir: out });

    const dictionary = JSON.parse(readFileSync(join(out, 'pl.json'), 'utf8')) as Record<
      string,
      string
    >;
    expect(dictionary).toEqual({ Play: 'Odtwarzaj' });
  });
});
