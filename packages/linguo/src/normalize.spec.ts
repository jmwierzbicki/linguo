import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { contextKey, normalizeKey } from './normalize';

interface NormalizationCase {
  readonly input: string;
  readonly output: string;
}

const cases: readonly NormalizationCase[] = JSON.parse(
  readFileSync(join(__dirname, '../../../tests/fixtures/normalization-cases.json'), 'utf8'),
) as NormalizationCase[];

describe('normalizeKey', () => {
  it.each(cases)('normalizes %j to %j (shared parity fixture)', ({ input, output }) => {
    expect(normalizeKey(input)).toBe(output);
  });
});

describe('contextKey', () => {
  const GLUE = String.fromCharCode(4);

  it('returns just the normalized key when there is no context', () => {
    expect(contextKey('  Play  ')).toBe('Play');
  });

  it('collapses whitespace in the context, not only the key', () => {
    // A multi-line context (e.g. a long translator note a formatter wrapped, or
    // one Angular collapsed inside an interpolation) must produce the same key
    // as its single-spaced form, or the contextual lookup misses.
    expect(contextKey('Play', 'Button that\n   starts a game')).toBe(
      `Button that starts a game${GLUE}Play`,
    );
  });

  it('produces the same key whether the context arrives multi-line or single-spaced', () => {
    expect(contextKey('Play', 'a\n  b')).toBe(contextKey('Play', 'a b'));
  });
});
