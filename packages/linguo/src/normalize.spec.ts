import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { normalizeKey } from './normalize';

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
