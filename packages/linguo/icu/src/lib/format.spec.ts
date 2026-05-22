import { formatMessage } from './format';

describe('formatMessage (MF1)', () => {
  const mf1 = { locale: 'en', format: 'mf1' } as const;

  it('interpolates a named argument', () => {
    expect(formatMessage('Hi {name}', { name: 'Ada' }, mf1)).toBe('Hi Ada');
  });

  it('selects the plural branch and substitutes #', () => {
    const msg = '{n, plural, one {# file} other {# files}}';
    expect(formatMessage(msg, { n: 1 }, mf1)).toBe('1 file');
    expect(formatMessage(msg, { n: 5 }, mf1)).toBe('5 files');
  });

  it('handles select', () => {
    const msg = '{g, select, female {She} male {He} other {They}}';
    expect(formatMessage(msg, { g: 'female' }, mf1)).toBe('She');
  });

  it('formats a percent number', () => {
    expect(formatMessage('{p, number, percent}', { p: 0.5 }, mf1)).toBe('50%');
  });

  it('applies locale-specific plural rules', () => {
    const msg = '{n, plural, one {# plik} few {# pliki} many {# plików} other {# pliku}}';
    expect(formatMessage(msg, { n: 5 }, { locale: 'pl', format: 'mf1' })).toBe('5 plików');
  });
});

describe('formatMessage (MF2)', () => {
  it('defaults to MessageFormat 2.0 when no format is given', () => {
    expect(formatMessage('Hello {$name}!', { name: 'Ada' }, { locale: 'en' })).toBe('Hello Ada!');
  });

  it('selects a plural variant via .match', () => {
    const msg = '.input {$n :number}\n.match $n\none {{{$n} file}}\n*   {{{$n} files}}';
    expect(formatMessage(msg, { n: 1 }, { locale: 'en' })).toBe('1 file');
    expect(formatMessage(msg, { n: 5 }, { locale: 'en' })).toBe('5 files');
  });
});

describe('formatMessage error handling', () => {
  it('returns the raw message when the pattern is malformed', () => {
    expect(formatMessage('{n, plural', { n: 1 }, { locale: 'en', format: 'mf1' })).toBe(
      '{n, plural',
    );
  });
});
