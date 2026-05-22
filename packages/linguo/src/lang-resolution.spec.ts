import { resolveInitialLang } from './lang-resolution';

const base = {
  persisted: null,
  browserLangs: [] as readonly string[],
  supportedLangs: ['en', 'pl', 'de'],
  defaultLang: 'en',
};

describe('resolveInitialLang', () => {
  it('prefers a supported persisted language above all else', () => {
    expect(resolveInitialLang({ ...base, persisted: 'de', browserLangs: ['pl'] })).toBe('de');
  });

  it('ignores a persisted language that is no longer supported', () => {
    expect(resolveInitialLang({ ...base, persisted: 'fr', browserLangs: ['pl-PL'] })).toBe('pl');
  });

  it('falls back to a browser-preferred language matched by base subtag', () => {
    expect(resolveInitialLang({ ...base, browserLangs: ['pl-PL', 'en-US'] })).toBe('pl');
  });

  it('matches an exact tag before the base subtag', () => {
    expect(
      resolveInitialLang({ ...base, supportedLangs: ['en', 'pt-BR'], browserLangs: ['pt-BR'] }),
    ).toBe('pt-BR');
  });

  it('skips browser languages it does not ship and uses the default', () => {
    expect(resolveInitialLang({ ...base, browserLangs: ['fr', 'es'] })).toBe('en');
  });

  it('uses the default when nothing is persisted or detected', () => {
    expect(resolveInitialLang(base)).toBe('en');
  });

  it('does not browser-match when supportedLangs is unknown (avoids guessing)', () => {
    expect(
      resolveInitialLang({ ...base, supportedLangs: undefined, browserLangs: ['pl-PL'] }),
    ).toBe('en');
  });

  it('still honors a persisted value when supportedLangs is unknown', () => {
    expect(resolveInitialLang({ ...base, supportedLangs: undefined, persisted: 'whatever' })).toBe(
      'whatever',
    );
  });
});
