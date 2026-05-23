import { parseSlots, slotsToText } from './slot-parser';

describe('slotsToText', () => {
  it('drops slot tags and keeps their inner text', () => {
    expect(slotsToText('Read the [docs]documentation[/docs] now')).toBe(
      'Read the documentation now',
    );
  });

  it('flattens nested slots', () => {
    expect(slotsToText('[a]x[b]y[/b]z[/a]')).toBe('xyz');
  });

  it('leaves plain text and non-tag brackets unchanged', () => {
    expect(slotsToText('array[0] = 1')).toBe('array[0] = 1');
  });

  it('unescapes [[ to a literal [ so bracketed text survives', () => {
    expect(slotsToText('Press [[Enter] to send')).toBe('Press [Enter] to send');
  });

  it('keeps an escaped pair literal instead of dropping it as a slot', () => {
    expect(slotsToText('Use [[b]bold[[/b] here, not [b]this[/b]')).toBe(
      'Use [b]bold[/b] here, not this',
    );
  });
});

describe('parseSlots', () => {
  it('returns a single text node for plain text', () => {
    expect(parseSlots('Hello world')).toEqual([{ kind: 'text', value: 'Hello world' }]);
  });

  it('returns an empty tree for an empty string', () => {
    expect(parseSlots('')).toEqual([]);
  });

  it('parses a slot wrapping text', () => {
    expect(parseSlots('[b]bold[/b]')).toEqual([
      { kind: 'slot', name: 'b', children: [{ kind: 'text', value: 'bold' }] },
    ]);
  });

  it('keeps surrounding text alongside a slot', () => {
    expect(parseSlots('Hello [b]world[/b]!')).toEqual([
      { kind: 'text', value: 'Hello ' },
      { kind: 'slot', name: 'b', children: [{ kind: 'text', value: 'world' }] },
      { kind: 'text', value: '!' },
    ]);
  });

  it('parses nested slots', () => {
    expect(parseSlots('[a][b]x[/b][/a]')).toEqual([
      {
        kind: 'slot',
        name: 'a',
        children: [{ kind: 'slot', name: 'b', children: [{ kind: 'text', value: 'x' }] }],
      },
    ]);
  });

  it('parses an empty slot', () => {
    expect(parseSlots('[b][/b]')).toEqual([{ kind: 'slot', name: 'b', children: [] }]);
  });

  it('accepts names with digits, underscores, and hyphens', () => {
    expect(parseSlots('[foo_bar-1]x[/foo_bar-1]')).toEqual([
      { kind: 'slot', name: 'foo_bar-1', children: [{ kind: 'text', value: 'x' }] },
    ]);
  });

  it('treats a name that starts with a digit as literal text, not a tag', () => {
    expect(parseSlots('[1abc]x[/1abc]')).toEqual([{ kind: 'text', value: '[1abc]x[/1abc]' }]);
  });

  it('treats a lone bracket as literal text', () => {
    expect(parseSlots('array[0] = 1')).toEqual([{ kind: 'text', value: 'array[0] = 1' }]);
  });

  it('treats an unclosed tag as literal text but keeps its contents', () => {
    expect(parseSlots('[b]hello')).toEqual([{ kind: 'text', value: '[b]hello' }]);
  });

  it('treats a closing tag with no matching open tag as literal text', () => {
    expect(parseSlots('hello[/b]')).toEqual([{ kind: 'text', value: 'hello[/b]' }]);
  });

  it('treats a mismatched closing tag as literal text', () => {
    expect(parseSlots('[a]x[/b]')).toEqual([{ kind: 'text', value: '[a]x[/b]' }]);
  });

  it('coalesces adjacent text produced by tolerated malformed input', () => {
    expect(parseSlots('[/x]y[/z]')).toEqual([{ kind: 'text', value: '[/x]y[/z]' }]);
  });

  it('parses [[ as a literal [ rather than the start of a tag', () => {
    expect(parseSlots('[[note] is literal')).toEqual([
      { kind: 'text', value: '[note] is literal' },
    ]);
  });

  it('does not open a slot when its opening bracket is escaped', () => {
    expect(parseSlots('[[b]x[/b]')).toEqual([{ kind: 'text', value: '[b]x[/b]' }]);
  });

  it('treats [[[ as a literal [ immediately followed by a real tag', () => {
    expect(parseSlots('[[[b]x[/b]')).toEqual([
      { kind: 'text', value: '[' },
      { kind: 'slot', name: 'b', children: [{ kind: 'text', value: 'x' }] },
    ]);
  });

  it('unescapes [[ inside slot content', () => {
    expect(parseSlots('[note]see [[x] here[/note]')).toEqual([
      { kind: 'slot', name: 'note', children: [{ kind: 'text', value: 'see [x] here' }] },
    ]);
  });
});
