/**
 * A single gettext `.po` catalog entry.
 *
 * `msgid` is the normalized source string and `msgstr` is the translation
 * (empty until a translator fills it in). `context` is the `msgctxt` (empty when
 * none) — it lets the same source text carry different translations and becomes
 * part of the compiled runtime key. `references` are the `#:` source locations.
 */
export interface PoEntry {
  readonly context: string;
  readonly msgid: string;
  readonly msgstr: string;
  readonly references: readonly string[];
}

function escapePo(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

function unescapePo(value: string): string {
  return value.replace(/\\([\\"nt])/g, (_match, char: string) =>
    char === 'n' ? '\n' : char === 't' ? '\t' : char,
  );
}

function quoted(value: string): string {
  const start = value.indexOf('"');
  const end = value.lastIndexOf('"');
  if (start < 0 || end <= start) {
    return '';
  }
  return unescapePo(value.slice(start + 1, end));
}

const HEADER = ['msgid ""', 'msgstr ""', '"Content-Type: text/plain; charset=UTF-8\\n"'].join('\n');

/**
 * Serialize catalog entries to gettext `.po` text, including a minimal UTF-8
 * header so standard translator tooling accepts the file.
 */
export function serializePo(entries: readonly PoEntry[]): string {
  const blocks = [HEADER];
  for (const entry of entries) {
    const lines: string[] = [];
    for (const reference of entry.references) {
      lines.push(`#: ${reference}`);
    }
    if (entry.context.length > 0) {
      lines.push(`msgctxt "${escapePo(entry.context)}"`);
    }
    lines.push(`msgid "${escapePo(entry.msgid)}"`);
    lines.push(`msgstr "${escapePo(entry.msgstr)}"`);
    blocks.push(lines.join('\n'));
  }
  return `${blocks.join('\n\n')}\n`;
}

interface Draft {
  context: string | null;
  references: string[];
  msgid: string | null;
  msgstr: string | null;
}

function emptyDraft(): Draft {
  return { context: null, references: [], msgid: null, msgstr: null };
}

/**
 * Parse gettext `.po` text into catalog entries. The header entry (empty
 * `msgid`) is dropped. Tolerant of multi-line quoted continuations and ignores
 * comment kinds it does not use (`#`, `#,`).
 */
export function parsePo(content: string): PoEntry[] {
  const entries: PoEntry[] = [];
  let draft = emptyDraft();
  let mode: 'msgctxt' | 'msgid' | 'msgstr' | null = null;

  const flush = (): void => {
    if (draft.msgid !== null && draft.msgid !== '') {
      entries.push({
        context: draft.context ?? '',
        msgid: draft.msgid,
        msgstr: draft.msgstr ?? '',
        references: draft.references,
      });
    }
    draft = emptyDraft();
    mode = null;
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (line.startsWith('#:')) {
      draft.references.push(line.slice(2).trim());
      mode = null;
    } else if (line.startsWith('#')) {
      // Other comment kinds (`#.`, `#,`, translator comments) are ignored.
      mode = null;
    } else if (line.startsWith('msgctxt ')) {
      draft.context = quoted(line.slice('msgctxt '.length));
      mode = 'msgctxt';
    } else if (line.startsWith('msgid ')) {
      draft.msgid = quoted(line.slice('msgid '.length));
      mode = 'msgid';
    } else if (line.startsWith('msgstr ')) {
      draft.msgstr = quoted(line.slice('msgstr '.length));
      mode = 'msgstr';
    } else if (line.startsWith('"')) {
      const continuation = quoted(line);
      if (mode === 'msgctxt') {
        draft.context = (draft.context ?? '') + continuation;
      } else if (mode === 'msgid') {
        draft.msgid = (draft.msgid ?? '') + continuation;
      } else if (mode === 'msgstr') {
        draft.msgstr = (draft.msgstr ?? '') + continuation;
      }
    }
  }
  flush();
  return entries;
}
