import { mark } from './mark';

describe('mark', () => {
  it('returns the message unchanged (it is only an extraction marker)', () => {
    expect(mark('{count, plural, one {# file} other {# files}}')).toBe(
      '{count, plural, one {# file} other {# files}}',
    );
  });
});
