import { parsePo, serializePo, type PoEntry } from './po';

const entry: PoEntry = {
  context: '',
  msgid: 'Hello [b]world[/b]',
  msgstr: 'Witaj [b]świecie[/b]',
  references: ['src/app/home.html:3', 'src/app/hero.html:8'],
};

describe('serializePo / parsePo', () => {
  it('round-trips an entry through serialize then parse', () => {
    expect(parsePo(serializePo([entry]))).toEqual([entry]);
  });

  it('round-trips a contextual (msgctxt) entry', () => {
    const contextual: PoEntry = { context: 'game', msgid: 'Play', msgstr: 'Graj', references: [] };
    expect(parsePo(serializePo([contextual]))).toEqual([contextual]);
  });

  it('drops the gettext header entry on parse', () => {
    expect(parsePo(serializePo([entry])).every((e) => e.msgid !== '')).toBe(true);
  });

  it('writes references as #: lines and context as msgctxt', () => {
    const po = serializePo([{ ...entry, context: 'home' }]);
    expect(po).toContain('#: src/app/home.html:3');
    expect(po).toContain('msgctxt "home"');
  });

  it('ignores #. comments on parse', () => {
    const po = [
      'msgid ""',
      'msgstr ""',
      '',
      '#. a translator note',
      'msgid "Play"',
      'msgstr "Graj"',
    ].join('\n');
    expect(parsePo(po)).toEqual([{ context: '', msgid: 'Play', msgstr: 'Graj', references: [] }]);
  });

  it('escapes and restores quotes and newlines', () => {
    const tricky: PoEntry = {
      context: '',
      msgid: 'a "quote"\nand newline',
      msgstr: '',
      references: [],
    };
    expect(parsePo(serializePo([tricky]))).toEqual([tricky]);
  });

  it('reads multi-line quoted continuations', () => {
    const po = [
      'msgid ""',
      'msgstr ""',
      '',
      'msgid "Hello "',
      '"world"',
      'msgstr "Hej "',
      '"świecie"',
    ].join('\n');
    expect(parsePo(po)).toEqual([
      { context: '', msgid: 'Hello world', msgstr: 'Hej świecie', references: [] },
    ]);
  });
});
