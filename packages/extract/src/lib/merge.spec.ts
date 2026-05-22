import { mergeCatalog } from './merge';
import type { ExtractedMessage } from './scan';
import type { PoEntry } from './po';

function msg(keyId: string, references: string[], context = ''): ExtractedMessage {
  return { keyId, context, references };
}

describe('mergeCatalog', () => {
  it('preserves an existing translation while refreshing references', () => {
    const existing: PoEntry[] = [
      { context: '', msgid: 'Play', msgstr: 'Odtwarzaj', references: ['old.html:1'] },
    ];
    const merged = mergeCatalog(existing, [msg('Play', ['new.html:9'])]);
    expect(merged).toEqual([
      { context: '', msgid: 'Play', msgstr: 'Odtwarzaj', references: ['new.html:9'] },
    ]);
  });

  it('treats the same key under different contexts as distinct entries', () => {
    const existing: PoEntry[] = [
      { context: 'game', msgid: 'Play', msgstr: 'Graj', references: ['g.html:1'] },
    ];
    const merged = mergeCatalog(existing, [
      msg('Play', ['g.html:1'], 'game'),
      msg('Play', ['a.html:1'], 'audio'),
    ]);
    expect(merged).toEqual([
      { context: 'game', msgid: 'Play', msgstr: 'Graj', references: ['g.html:1'] },
      { context: 'audio', msgid: 'Play', msgstr: '', references: ['a.html:1'] },
    ]);
  });

  it('keeps entries in extraction (discovery) order rather than sorting', () => {
    const merged = mergeCatalog([], [msg('Zoom', ['z.html:1']), msg('Apple', ['a.html:1'])]);
    expect(merged.map((e) => e.msgid)).toEqual(['Zoom', 'Apple']);
  });

  it('adds new keys with an empty translation', () => {
    const merged = mergeCatalog([], [msg('Pause', ['a.html:2'])]);
    expect(merged).toEqual([{ context: '', msgid: 'Pause', msgstr: '', references: ['a.html:2'] }]);
  });

  it('drops keys that no longer appear in the source', () => {
    const existing: PoEntry[] = [
      { context: '', msgid: 'Gone', msgstr: 'Zniknęło', references: ['x.html:1'] },
    ];
    const merged = mergeCatalog(existing, [msg('Play', ['a.html:1'])]);
    expect(merged.map((e) => e.msgid)).toEqual(['Play']);
  });
});
