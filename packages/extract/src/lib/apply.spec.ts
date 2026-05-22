import { applyTranslations, isUntranslated } from './apply';
import { parsePo } from './po';

const MISSING = '<MISSING TRANSLATION>';

function po(...entries: string[]): string {
  return ['msgid ""\nmsgstr ""', ...entries].join('\n\n');
}

describe('isUntranslated', () => {
  it('treats empty and <MISSING TRANSLATION>-prefixed values as untranslated', () => {
    expect(isUntranslated('')).toBe(true);
    expect(isUntranslated(`${MISSING} Play`)).toBe(true);
    expect(isUntranslated('Graj')).toBe(false);
  });
});

describe('applyTranslations', () => {
  const full = po(
    `msgid "Play"\nmsgstr "${MISSING} Play"`,
    `msgctxt "game"\nmsgid "Play"\nmsgstr "${MISSING} Play"`,
    `msgid "Hello"\nmsgstr "Cześć"`,
  );

  it('applies a translation matched by msgid', () => {
    const { po: out, applied } = applyTranslations(full, po(`msgid "Play"\nmsgstr "Odtwórz"`));
    expect(applied).toBe(1);
    const entry = parsePo(out).find((e) => e.msgid === 'Play' && e.context === '');
    expect(entry?.msgstr).toBe('Odtwórz');
  });

  it('matches on context, leaving the same msgid in another context untouched', () => {
    const { po: out, applied } = applyTranslations(
      full,
      po(`msgctxt "game"\nmsgid "Play"\nmsgstr "Graj"`),
    );
    expect(applied).toBe(1);
    const entries = parsePo(out);
    expect(entries.find((e) => e.context === 'game')?.msgstr).toBe('Graj');
    expect(entries.find((e) => e.context === '' && e.msgid === 'Play')?.msgstr).toBe(
      `${MISSING} Play`,
    );
  });

  it('ignores reply entries that are still untranslated', () => {
    const { applied } = applyTranslations(full, po(`msgid "Play"\nmsgstr "${MISSING} Play"`));
    expect(applied).toBe(0);
  });

  it('ignores reply entries with no matching key in the full catalog', () => {
    const { applied } = applyTranslations(full, po(`msgid "Unknown"\nmsgstr "Nieznane"`));
    expect(applied).toBe(0);
  });

  it('ignores a reply that repeats the current translation (no-op)', () => {
    const { applied } = applyTranslations(full, po(`msgid "Hello"\nmsgstr "Cześć"`));
    expect(applied).toBe(0);
  });

  it('preserves entries it does not touch', () => {
    const { po: out } = applyTranslations(full, po(`msgid "Play"\nmsgstr "Odtwórz"`));
    expect(parsePo(out)).toHaveLength(3);
    expect(parsePo(out).find((e) => e.msgid === 'Hello')?.msgstr).toBe('Cześć');
  });
});
