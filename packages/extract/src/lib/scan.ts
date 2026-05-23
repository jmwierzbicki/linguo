import { normalizeMessage } from './normalize';

/** A source file to scan for translatable strings. */
export interface SourceFile {
  /** Path used in `#:` references, e.g. `src/app/player.html`. */
  readonly path: string;
  readonly content: string;
}

/** A translatable string found during scanning, with its source locations. */
export interface ExtractedMessage {
  /** Normalized source string — the catalog `msgid`. */
  readonly keyId: string;
  /** Disambiguating context (`msgctxt`), or `''` for the default entry. */
  readonly context: string;
  /** Sorted, de-duplicated `path:line` references. */
  readonly references: readonly string[];
}

// The `t` pipe: `'Play' | t` with an optional options object (`| t: { ... }`).
// Group 2 is the key; group 3 is the options object (one level of nesting), from
// which the context is read.
const PIPE_PATTERN =
  /(['"])((?:\\.|(?!\1).)*?)\1\s*\|\s*t\b(?:\s*:\s*(\{(?:[^{}]|\{[^{}]*\})*\}))?/g;
// `mark('...')` — the extraction marker for messages defined outside a template
// (e.g. a component field). Not preceded by `.` so `foo.mark(...)` is ignored.
// Group 2 is the key; group 3 is the optional options object (`mark('…', { … })`,
// one level of nesting), from which the context is read.
const MARK_PATTERN =
  /(?<!\.)\bmark\s*\(\s*(['"])((?:\\.|(?!\1).)*?)\1(?:\s*,\s*(\{(?:[^{}]|\{[^{}]*\})*\}))?/g;
// The `t('...', { ... })` helper call (from `injectTranslate()`). The lookbehind
// keeps it from matching `obj.t(`, `$t(`, or the tail of an identifier. Group 2
// is the key; group 3 is the options object, from which the context is read.
const T_CALL_PATTERN =
  /(?<![\w.$])t\s*\(\s*(['"])((?:\\.|(?!\1).)*?)\1(?:\s*,\s*(\{(?:[^{}]|\{[^{}]*\})*\}))?/g;
// An element carrying the `[t]` directive via a static `t="message"` attribute.
// `(?<![\w-])t\s*=` matches a standalone `t=` attribute (not `alt`, `data-t`,
// `tParams`, `tContext`, `tFor`, nor bound `[t]="…"`). Group 2 is the message.
const DIRECTIVE_TAG_PATTERN = /<[a-zA-Z][\w-]*\b[^>]*?(?<![\w-])t\s*=\s*"(?:\\.|[^"])*"[^>]*>/g;
const DIRECTIVE_MESSAGE_PATTERN = /(?<![\w-])t\s*=\s*"((?:\\.|[^"])*)"/;
const DIRECTIVE_CONTEXT_PATTERN = /(?<![\w-])tContext\s*=\s*"((?:\\.|[^"])*)"/;
// Reads `context: '…'` out of a pipe options object.
const CONTEXT_IN_OPTIONS = /\bcontext\s*:\s*(['"])((?:\\.|(?!\1).)*?)\1/;

// Joins context and key for the dedup map (gettext EOT glue).
const GLUE = String.fromCharCode(4);

// Source-comment directives that exclude regions from extraction — for
// documentation samples whose strings would otherwise scan as real messages.
// Matched as plain substrings, so they work the same in `//`, `/* */`, and
// `<!-- -->` comments without the scanner having to understand any of them.
const IGNORE_FILE = 'linguo-ignore-file';
const IGNORE_MARKER = /linguo-ignore-(next-line|start|end)/g;

interface IgnoredRange {
  readonly start: number;
  readonly end: number;
}

/**
 * Character ranges of `content` excluded from extraction by `linguo-ignore`
 * directives:
 *
 * - `linguo-ignore-file` anywhere — skip the whole file.
 * - `linguo-ignore-start` … `linguo-ignore-end` — skip everything between them;
 *   an unmatched `start` skips to end of file.
 * - `linguo-ignore-next-line` — skip the single line after the directive.
 */
function ignoredRanges(content: string): readonly IgnoredRange[] {
  if (content.includes(IGNORE_FILE)) {
    return [{ start: 0, end: content.length }];
  }
  const ranges: IgnoredRange[] = [];
  let blockStart: number | null = null;
  IGNORE_MARKER.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IGNORE_MARKER.exec(content)) !== null) {
    const kind = match[1];
    if (kind === 'next-line') {
      const lineEnd = content.indexOf('\n', match.index);
      if (lineEnd === -1) {
        continue; // directive on the last line — nothing follows to skip
      }
      const after = content.indexOf('\n', lineEnd + 1);
      ranges.push({ start: lineEnd + 1, end: after === -1 ? content.length : after });
    } else if (kind === 'start') {
      blockStart ??= match.index;
    } else if (kind === 'end' && blockStart !== null) {
      ranges.push({ start: blockStart, end: match.index });
      blockStart = null;
    }
  }
  if (blockStart !== null) {
    ranges.push({ start: blockStart, end: content.length });
  }
  return ranges;
}

function unescapeJs(value: string): string {
  return value.replace(/\\([\\'"`ntr])/g, (_match, char: string) => {
    if (char === 'n') return '\n';
    if (char === 't') return '\t';
    if (char === 'r') return '\r';
    return char;
  });
}

function lineOf(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i += 1) {
    if (content[i] === '\n') {
      line += 1;
    }
  }
  return line;
}

interface Occurrence {
  keyId: string;
  context: string;
  refs: Set<string>;
}

function record(into: Map<string, Occurrence>, found: Found, reference: string): void {
  if (found.keyId === '') {
    return;
  }
  const id = found.context === '' ? found.keyId : `${found.context}${GLUE}${found.keyId}`;
  const occurrence = into.get(id) ?? {
    keyId: found.keyId,
    context: found.context,
    refs: new Set<string>(),
  };
  occurrence.refs.add(reference);
  into.set(id, occurrence);
}

interface Found {
  readonly index: number;
  readonly keyId: string;
  readonly context: string;
}

/**
 * Scan source files for translatable strings used by the `t` pipe
 * (`'Play' | t: { context }`), the `[t]` directive (`t="message"` with an
 * optional `tContext`), the `t('...', { context })` helper call, and the
 * `mark()` marker, returning one {@link ExtractedMessage} per unique
 * (context, key) pair with all of its source references.
 *
 * Pure and DOM-free, so it runs in CI on plain Node (CLAUDE.md §2.1). Entries
 * are returned in order of discovery — files in the order given, and within a
 * file by source position — so re-extraction produces a stable, readable order.
 *
 * Regions marked with `linguo-ignore` comment directives are skipped, so
 * documentation samples containing `mark(`, `'…' | t`, or `t="…"` are not
 * scanned as real messages (see {@link ignoredRanges}).
 */
export function extractMessages(files: readonly SourceFile[]): ExtractedMessage[] {
  const occurrences = new Map<string, Occurrence>();

  for (const file of files) {
    const found: Found[] = [];

    const fromOptions = (index: number, key: string, options: string | undefined): void => {
      const contextMatch = options ? CONTEXT_IN_OPTIONS.exec(options) : null;
      found.push({
        index,
        keyId: normalizeMessage(unescapeJs(key)),
        context: contextMatch ? unescapeJs(contextMatch[2] ?? '').trim() : '',
      });
    };

    PIPE_PATTERN.lastIndex = 0;
    let pipeMatch: RegExpExecArray | null;
    while ((pipeMatch = PIPE_PATTERN.exec(file.content)) !== null) {
      fromOptions(pipeMatch.index, pipeMatch[2] ?? '', pipeMatch[3]);
    }

    MARK_PATTERN.lastIndex = 0;
    let markMatch: RegExpExecArray | null;
    while ((markMatch = MARK_PATTERN.exec(file.content)) !== null) {
      fromOptions(markMatch.index, markMatch[2] ?? '', markMatch[3]);
    }

    T_CALL_PATTERN.lastIndex = 0;
    let callMatch: RegExpExecArray | null;
    while ((callMatch = T_CALL_PATTERN.exec(file.content)) !== null) {
      fromOptions(callMatch.index, callMatch[2] ?? '', callMatch[3]);
    }

    DIRECTIVE_TAG_PATTERN.lastIndex = 0;
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = DIRECTIVE_TAG_PATTERN.exec(file.content)) !== null) {
      const tag = tagMatch[0];
      const messageMatch = DIRECTIVE_MESSAGE_PATTERN.exec(tag);
      if (!messageMatch) {
        continue;
      }
      const contextMatch = DIRECTIVE_CONTEXT_PATTERN.exec(tag);
      found.push({
        index: tagMatch.index,
        keyId: normalizeMessage(messageMatch[1] ?? ''),
        context: contextMatch ? (contextMatch[1]?.trim() ?? '') : '',
      });
    }

    // Interleave pipe and directive matches by source position so discovery
    // order reflects how the file actually reads.
    found.sort((a, b) => a.index - b.index);

    const ignored = ignoredRanges(file.content);
    const isIgnored = (index: number): boolean =>
      ignored.some((range) => index >= range.start && index < range.end);

    for (const item of found) {
      if (isIgnored(item.index)) {
        continue;
      }
      record(occurrences, item, `${file.path}:${lineOf(file.content, item.index)}`);
    }
  }

  // Map preserves insertion order, so this is discovery order.
  return [...occurrences.values()].map(({ keyId, context, refs }) => ({
    keyId,
    context,
    references: [...refs].sort(),
  }));
}
