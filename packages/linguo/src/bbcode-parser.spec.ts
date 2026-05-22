import { bbcodeToText, parseBBCode } from './bbcode-parser';

describe('bbcodeToText', () => {
  it('drops placeholder tags and keeps their inner text', () => {
    expect(bbcodeToText('Read the [docs]documentation[/docs] now')).toBe(
      'Read the documentation now',
    );
  });

  it('flattens nested placeholders', () => {
    expect(bbcodeToText('[a]x[b]y[/b]z[/a]')).toBe('xyz');
  });

  it('leaves plain text and non-tag brackets unchanged', () => {
    expect(bbcodeToText('array[0] = 1')).toBe('array[0] = 1');
  });
});

describe('parseBBCode', () => {
  it('returns a single text node for plain text', () => {
    expect(parseBBCode('Hello world')).toEqual([{ kind: 'text', value: 'Hello world' }]);
  });

  it('returns an empty tree for an empty string', () => {
    expect(parseBBCode('')).toEqual([]);
  });

  it('parses a placeholder wrapping text', () => {
    expect(parseBBCode('[b]bold[/b]')).toEqual([
      { kind: 'placeholder', name: 'b', children: [{ kind: 'text', value: 'bold' }] },
    ]);
  });

  it('keeps surrounding text alongside a placeholder', () => {
    expect(parseBBCode('Hello [b]world[/b]!')).toEqual([
      { kind: 'text', value: 'Hello ' },
      { kind: 'placeholder', name: 'b', children: [{ kind: 'text', value: 'world' }] },
      { kind: 'text', value: '!' },
    ]);
  });

  it('parses nested placeholders', () => {
    expect(parseBBCode('[a][b]x[/b][/a]')).toEqual([
      {
        kind: 'placeholder',
        name: 'a',
        children: [{ kind: 'placeholder', name: 'b', children: [{ kind: 'text', value: 'x' }] }],
      },
    ]);
  });

  it('parses an empty placeholder', () => {
    expect(parseBBCode('[b][/b]')).toEqual([{ kind: 'placeholder', name: 'b', children: [] }]);
  });

  it('accepts names with digits, underscores, and hyphens', () => {
    expect(parseBBCode('[foo_bar-1]x[/foo_bar-1]')).toEqual([
      { kind: 'placeholder', name: 'foo_bar-1', children: [{ kind: 'text', value: 'x' }] },
    ]);
  });

  it('treats a name that starts with a digit as literal text, not a tag', () => {
    expect(parseBBCode('[1abc]x[/1abc]')).toEqual([{ kind: 'text', value: '[1abc]x[/1abc]' }]);
  });

  it('treats a lone bracket as literal text', () => {
    expect(parseBBCode('array[0] = 1')).toEqual([{ kind: 'text', value: 'array[0] = 1' }]);
  });

  it('treats an unclosed tag as literal text but keeps its contents', () => {
    expect(parseBBCode('[b]hello')).toEqual([{ kind: 'text', value: '[b]hello' }]);
  });

  it('treats a closing tag with no matching open tag as literal text', () => {
    expect(parseBBCode('hello[/b]')).toEqual([{ kind: 'text', value: 'hello[/b]' }]);
  });

  it('treats a mismatched closing tag as literal text', () => {
    expect(parseBBCode('[a]x[/b]')).toEqual([{ kind: 'text', value: '[a]x[/b]' }]);
  });

  it('coalesces adjacent text produced by tolerated malformed input', () => {
    expect(parseBBCode('[/x]y[/z]')).toEqual([{ kind: 'text', value: '[/x]y[/z]' }]);
  });
});
