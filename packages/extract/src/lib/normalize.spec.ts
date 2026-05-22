import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { normalizeMessage } from './normalize';

interface NormalizationCase {
  readonly input: string;
  readonly output: string;
}

const cases: readonly NormalizationCase[] = JSON.parse(
  readFileSync(join(__dirname, '../../../../tests/fixtures/normalization-cases.json'), 'utf8'),
) as NormalizationCase[];

describe('normalizeMessage', () => {
  it.each(cases)('matches the shared runtime parity fixture: %j -> %j', ({ input, output }) => {
    expect(normalizeMessage(input)).toBe(output);
  });

  it('returns short text unchanged', () => {
    expect(normalizeMessage('Hello')).toBe('Hello');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeMessage('  Hello  ')).toBe('Hello');
  });

  it('collapses internal whitespace runs to a single space', () => {
    expect(normalizeMessage('Hello    world')).toBe('Hello world');
  });

  it('collapses newlines and tabs from multi-line templates', () => {
    expect(normalizeMessage('Hello\n\t  world')).toBe('Hello world');
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(normalizeMessage('   \n  ')).toBe('');
  });
});
