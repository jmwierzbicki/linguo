import type { ExtractedMessage } from './scan';
import type { PoEntry } from './po';

// Joins context and key when matching entries (gettext EOT glue).
const GLUE = String.fromCharCode(4);

function identity(context: string, msgid: string): string {
  return context === '' ? msgid : `${context}${GLUE}${msgid}`;
}

/**
 * Merge freshly extracted messages into an existing catalog.
 *
 * The existing `translation` (msgstr) is preserved for entries that still appear
 * in the source — matched by their (context, key) identity — and `references`
 * are refreshed to the current locations. Entries no longer
 * present are dropped; new ones are added with an empty translation. The result
 * follows the extraction order (order of discovery), so re-extraction keeps the
 * catalog stable and readable.
 */
export function mergeCatalog(
  existing: readonly PoEntry[],
  extracted: readonly ExtractedMessage[],
): PoEntry[] {
  const previous = new Map<string, PoEntry>();
  for (const entry of existing) {
    previous.set(identity(entry.context, entry.msgid), entry);
  }

  return extracted.map((message): PoEntry => {
    const prior = previous.get(identity(message.context, message.keyId));
    return {
      context: message.context,
      msgid: message.keyId,
      msgstr: prior?.msgstr ?? '',
      references: message.references,
    };
  });
}
