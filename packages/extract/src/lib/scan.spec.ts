import { extractMessages } from './scan';

describe('extractMessages', () => {
  it('extracts strings used with the t pipe', () => {
    const result = extractMessages([
      { path: 'a.html', content: `<button>{{ 'Play' | t }}</button>` },
    ]);
    expect(result).toEqual([{ keyId: 'Play', context: '', references: ['a.html:1'] }]);
  });

  it('captures a t pipe string a formatter wrapped across several lines', () => {
    // Prettier wraps long interpolations, so the string literal spans physical
    // lines and the options object trails onto the next ones. The runtime
    // collapses the embedded whitespace into single spaces; the extractor must
    // capture the whole literal and normalize it identically (CLAUDE.md §5.2).
    const result = extractMessages([
      {
        path: 'a.html',
        content:
          `<p>{{ 'Heads up: the t pipe is impure, so Angular re-checks it\n` +
          `      on every pass.' | t : {\n` +
          `      context: 'Note under the pipe example' } }}</p>`,
      },
    ]);
    expect(result).toEqual([
      {
        keyId: 'Heads up: the t pipe is impure, so Angular re-checks it on every pass.',
        context: 'Note under the pipe example',
        references: ['a.html:1'],
      },
    ]);
  });

  it('extracts the message from a t directive attribute (ICU and slot tags are safe there)', () => {
    const result = extractMessages([
      { path: 'a.html', content: `<p t="Hello [b]world[/b] {$name}!"></p>` },
    ]);
    expect(result).toEqual([
      { keyId: 'Hello [b]world[/b] {$name}!', context: '', references: ['a.html:1'] },
    ]);
  });

  it('captures tContext and ignores tFor placeholder templates', () => {
    const result = extractMessages([
      {
        path: 'a.html',
        content:
          `<p t="Play" tContext="Button that starts a game"></p>` +
          `<ng-template tFor="docs"><a>x</a></ng-template>`,
      },
    ]);
    expect(result).toEqual([
      { keyId: 'Play', context: 'Button that starts a game', references: ['a.html:1'] },
    ]);
  });

  it('ignores lookalike attributes (alt, data-t, tParams) and bound [t]', () => {
    const result = extractMessages([
      {
        path: 'a.html',
        content: `<img alt="logo" data-t="x" /><p [t]="dynamic" [tParams]="{ n }"></p>`,
      },
    ]);
    expect(result).toEqual([]);
  });

  it('extracts strings wrapped in the mark() marker (e.g. from a .ts file)', () => {
    const result = extractMessages([
      {
        path: 'app.ts',
        content: `readonly fileCount = mark('{count, plural, one {# file} other {# files}}');`,
      },
    ]);
    expect(result).toEqual([
      {
        keyId: '{count, plural, one {# file} other {# files}}',
        context: '',
        references: ['app.ts:1'],
      },
    ]);
  });

  it('captures the context from a mark() options object', () => {
    const result = extractMessages([
      {
        path: 'app.ts',
        content: `readonly files = mark('{$count} files', { context: 'file = a document' });`,
      },
    ]);
    expect(result).toEqual([
      { keyId: '{$count} files', context: 'file = a document', references: ['app.ts:1'] },
    ]);
  });

  it('ignores a mark call that is a method (preceded by a dot)', () => {
    const result = extractMessages([{ path: 'a.ts', content: `pen.mark('not a message')` }]);
    expect(result).toEqual([]);
  });

  it('extracts t() helper calls (context from options), ignoring injectTranslate and obj.t', () => {
    const result = extractMessages([
      {
        path: 'a.ts',
        content:
          `const t = injectTranslate();` +
          `const a = t('Play', { context: 'game' });` +
          `other.t('skip');` +
          `const b = t('Hello {$name}!');`,
      },
    ]);
    expect(result).toEqual([
      { keyId: 'Play', context: 'game', references: ['a.ts:1'] },
      { keyId: 'Hello {$name}!', context: '', references: ['a.ts:1'] },
    ]);
  });

  it('extracts the key when the t pipe is given params (params is not context)', () => {
    const result = extractMessages([
      { path: 'a.html', content: `{{ 'Hello {name}' | t: { params: { name: who } } }}` },
    ]);
    expect(result).toEqual([{ keyId: 'Hello {name}', context: '', references: ['a.html:1'] }]);
  });

  it('captures the context from a pipe options object', () => {
    const result = extractMessages([
      { path: 'a.html', content: `{{ 'Play' | t: { context: 'game', params: { n } } }}` },
    ]);
    expect(result).toEqual([{ keyId: 'Play', context: 'game', references: ['a.html:1'] }]);
  });

  it('keeps the same key under different contexts as separate messages', () => {
    const result = extractMessages([
      {
        path: 'a.html',
        content: `{{ 'Play' | t: { context: 'game' } }}{{ 'Play' | t: { context: 'audio' } }}`,
      },
    ]);
    expect(result).toEqual([
      { keyId: 'Play', context: 'game', references: ['a.html:1'] },
      { keyId: 'Play', context: 'audio', references: ['a.html:1'] },
    ]);
  });

  it('returns entries in order of discovery, interleaving pipe and directive by position', () => {
    const result = extractMessages([
      { path: 'a.html', content: `{{ 'Zebra' | t }}<p t="Apple"></p>{{ 'Mango' | t }}` },
    ]);
    expect(result.map((e) => e.keyId)).toEqual(['Zebra', 'Apple', 'Mango']);
  });

  it('normalizes whitespace in the extracted key', () => {
    const result = extractMessages([{ path: 'a.html', content: `{{ '  Play   now  ' | t }}` }]);
    expect(result[0]?.keyId).toBe('Play now');
  });

  it('aggregates references for the same key across files, sorted and de-duplicated', () => {
    const result = extractMessages([
      { path: 'b.html', content: `{{ 'Play' | t }}` },
      { path: 'a.html', content: `{{ 'Play' | t }}\n{{ 'Play' | t }}` },
    ]);
    expect(result).toEqual([
      { keyId: 'Play', context: '', references: ['a.html:1', 'a.html:2', 'b.html:1'] },
    ]);
  });

  it('reports the line number of each occurrence', () => {
    const result = extractMessages([{ path: 'a.html', content: `line one\n{{ 'Play' | t }}` }]);
    expect(result[0]?.references).toEqual(['a.html:2']);
  });

  it('skips a region wrapped in linguo-ignore-start/end but keeps strings outside it', () => {
    const result = extractMessages([
      {
        path: 'a.ts',
        content:
          `const real = mark('Keep me');\n` +
          `// linguo-ignore-start\n` +
          `const sample = "<p t=\\"Doc only\\"></p> and mark('Doc too')";\n` +
          `// linguo-ignore-end\n` +
          `const also = mark('Keep me too');\n`,
      },
    ]);
    expect(result.map((e) => e.keyId)).toEqual(['Keep me', 'Keep me too']);
  });

  it('skips an entire file marked with linguo-ignore-file', () => {
    const result = extractMessages([
      {
        path: 'samples.ts',
        content: `// linguo-ignore-file\nconst a = mark('Nope');\nconst b = 'Also nope' + ' | t';`,
      },
    ]);
    expect(result).toEqual([]);
  });

  it('skips only the line after linguo-ignore-next-line', () => {
    const result = extractMessages([
      {
        path: 'a.html',
        content: `{{ 'Before' | t }}\n<!-- linguo-ignore-next-line -->\n{{ 'Skipped' | t }}\n{{ 'After' | t }}`,
      },
    ]);
    expect(result.map((e) => e.keyId)).toEqual(['Before', 'After']);
  });

  it('treats an unclosed linguo-ignore-start as ignoring to end of file', () => {
    const result = extractMessages([
      {
        path: 'a.ts',
        content: `const real = mark('Keep');\n// linguo-ignore-start\nconst sample = mark('Gone');`,
      },
    ]);
    expect(result.map((e) => e.keyId)).toEqual(['Keep']);
  });
});
