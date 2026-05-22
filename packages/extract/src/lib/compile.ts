import type { PoEntry } from './po';

// Joins context and key in the runtime dictionary. This is the gettext
// `pgettext` convention (the EOT control character) and MUST stay identical to
// `@ng-linguo/linguo`'s `contextKey`, so a contextual key compiled here resolves
// at runtime.
const CONTEXT_GLUE = String.fromCharCode(4);

/**
 * Compile catalog entries into the runtime dictionary the loader consumes: a
 * flat `key -> translation` map (CLAUDE.md §5.3's stable JSON format).
 *
 * Entries with a context are keyed as `context<glue>msgid` so the same source
 * text can carry multiple translations; entries without one are keyed by the
 * plain `msgid`, which is also the fallback the runtime uses when no context is
 * supplied. Entries with an empty translation are omitted, so the runtime falls
 * back to showing the key itself.
 */
export function compileEntries(entries: readonly PoEntry[]): Record<string, string> {
  const dictionary: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.msgstr.length > 0) {
      const key =
        entry.context === '' ? entry.msgid : `${entry.context}${CONTEXT_GLUE}${entry.msgid}`;
      dictionary[key] = entry.msgstr;
    }
  }
  return dictionary;
}
