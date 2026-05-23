import { buildTranslationPrompt, resolveTargetLocale } from './prompt';

describe('buildTranslationPrompt', () => {
  const po = 'msgid "Play"\nmsgstr "<MISSING TRANSLATION> Play"';

  it('injects the target language label into every slot', () => {
    const prompt = buildTranslationPrompt('Polish (pl)', po);
    expect(prompt).not.toContain('{{TARGET_LANGUAGE}}');
    expect(prompt).toContain('into Polish (pl).');
  });

  it('appends the full .po contents and consumes the file slot', () => {
    const prompt = buildTranslationPrompt('German (de)', po);
    expect(prompt).not.toContain('{{PO_FILE}}');
    expect(prompt).toContain(po);
  });

  it('keeps the ng-linguo concepts the LLM needs (context, slot tags, MF2)', () => {
    const prompt = buildTranslationPrompt('Polish (pl)', po);
    expect(prompt).toContain('msgctxt');
    expect(prompt).toContain('[name]...[/name]');
    expect(prompt).toContain('MessageFormat 2');
  });
});

describe('resolveTargetLocale', () => {
  const locales = ['en', 'pl', 'de'];

  it('matches a locale code directly and labels it with the English name', () => {
    expect(resolveTargetLocale('pl', locales)).toEqual({ locale: 'pl', label: 'Polish (pl)' });
  });

  it('matches the English language name case-insensitively', () => {
    expect(resolveTargetLocale('GERMAN', locales)?.locale).toBe('de');
  });

  it('matches the endonym (the language’s own name)', () => {
    expect(resolveTargetLocale('Polski', locales)?.locale).toBe('pl');
  });

  it('returns undefined when nothing matches a configured locale', () => {
    expect(resolveTargetLocale('Klingon', locales)).toBeUndefined();
  });

  it('returns undefined for blank input', () => {
    expect(resolveTargetLocale('   ', locales)).toBeUndefined();
  });
});
