import { mark } from './mark';

describe('mark', () => {
  it('returns the message unchanged (it is only an extraction marker)', () => {
    expect(mark('{count, plural, one {# file} other {# files}}')).toBe(
      '{count, plural, one {# file} other {# files}}',
    );
  });

  it('returns the message unchanged when given context options (a runtime no-op)', () => {
    expect(mark('{$count} files', { context: 'file = a document' })).toBe('{$count} files');
  });
});
