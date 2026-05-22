import { selectPlural } from './plural';

describe('selectPlural', () => {
  it('selects the "one" category for a count of one in English', () => {
    expect(selectPlural(1, 'en')).toBe('one');
  });

  it('selects the "other" category for a plural count in English', () => {
    expect(selectPlural(5, 'en')).toBe('other');
  });

  it('uses the locale rules rather than the ambient locale', () => {
    expect(selectPlural(2, 'pl')).toBe('few');
  });
});
