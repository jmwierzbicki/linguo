import { compileEntries } from './compile';
import type { PoEntry } from './po';

// The context/key separator (gettext EOT glue), matching the runtime.
const GLUE = String.fromCharCode(4);

describe('compileEntries', () => {
  it('builds a key to translation dictionary', () => {
    const entries: PoEntry[] = [
      { context: '', msgid: 'Play', msgstr: 'Odtwarzaj', references: [] },
    ];
    expect(compileEntries(entries)).toEqual({ Play: 'Odtwarzaj' });
  });

  it('keys contextual entries as context<glue>msgid, alongside the plain fallback', () => {
    const entries: PoEntry[] = [
      { context: '', msgid: 'Play', msgstr: 'Play', references: [] },
      { context: 'game', msgid: 'Play', msgstr: 'Graj', references: [] },
      { context: 'audio', msgid: 'Play', msgstr: 'Odtwarzaj', references: [] },
    ];
    expect(compileEntries(entries)).toEqual({
      Play: 'Play',
      [`game${GLUE}Play`]: 'Graj',
      [`audio${GLUE}Play`]: 'Odtwarzaj',
    });
  });

  it('omits entries with an empty translation so the runtime falls back to the key', () => {
    const entries: PoEntry[] = [
      { context: '', msgid: 'Play', msgstr: 'Odtwarzaj', references: [] },
      { context: '', msgid: 'Pause', msgstr: '', references: [] },
    ];
    expect(compileEntries(entries)).toEqual({ Play: 'Odtwarzaj' });
  });

  it('returns an empty dictionary for no entries', () => {
    expect(compileEntries([])).toEqual({});
  });
});
