import { parsePo, serializePo, type PoEntry } from './po';
import { MISSING_PREFIX } from './runner';

/** Whether a `msgstr` is still untranslated (empty or `<MISSING TRANSLATION>`). */
export function isUntranslated(msgstr: string): boolean {
  return msgstr === '' || msgstr.startsWith(MISSING_PREFIX);
}

/** Identity matching an entry across two catalogs: context + source text. */
function identity(entry: PoEntry): string {
  return `${entry.context} ${entry.msgid}`;
}

/** Outcome of {@link applyTranslations}. */
export interface ApplyResult {
  /** The updated full catalog as `.po` text. */
  readonly po: string;
  /** How many entries received a new translation. */
  readonly applied: number;
}

/**
 * Merge translated `msgstr`s from a (possibly partial) reply catalog into a full
 * catalog, matched by `(context, msgid)`. This is how the interactive wizard
 * folds an LLM's reply — which contains only the previously untranslated entries
 * — back into the complete `.po`.
 *
 * Reply entries that are still untranslated (empty or `<MISSING TRANSLATION>`),
 * that do not match an existing entry, or that repeat the current value are
 * ignored, so pasting the wrong text cannot corrupt the catalog.
 */
export function applyTranslations(fullPo: string, replyPo: string): ApplyResult {
  const entries = parsePo(fullPo);
  const index = new Map(entries.map((entry, i) => [identity(entry), i]));
  const merged = entries.slice();
  let applied = 0;

  for (const replied of parsePo(replyPo)) {
    if (isUntranslated(replied.msgstr)) {
      continue;
    }
    const i = index.get(identity(replied));
    const current = i === undefined ? undefined : merged[i];
    if (i !== undefined && current !== undefined && current.msgstr !== replied.msgstr) {
      merged[i] = { ...current, msgstr: replied.msgstr };
      applied += 1;
    }
  }

  return { po: serializePo(merged), applied };
}
