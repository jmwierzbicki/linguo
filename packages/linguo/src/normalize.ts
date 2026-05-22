/**
 * Normalize a source message to its canonical translation key.
 *
 * Trims the message and collapses every internal whitespace run (including
 * newlines from multi-line templates) to a single space. This MUST stay
 * byte-for-byte identical to the extractor's normalizer
 * (`@ng-linguo/extract`'s `normalizeMessage`) so that a key extracted at build
 * time resolves at runtime — the parity contract in CLAUDE.md §5.2, verified by
 * both packages against `tests/fixtures/normalization-cases.json`.
 *
 * Duplicated rather than imported because `core` must not depend on `extract`
 * (CLAUDE.md §2.1).
 */
export function normalizeKey(source: string): string {
  return source.trim().replace(/\s+/g, ' ');
}

/**
 * Separator joining a context to a key in the compiled dictionary. This is the
 * gettext `pgettext` convention — the EOT control character (U+0004) — chosen
 * because it never occurs in real translator text, so contextual keys cannot
 * collide with plain ones. MUST stay identical to the extractor's
 * `compileEntries`, so a contextual key produced at build time resolves at
 * runtime.
 */
const CONTEXT_GLUE = String.fromCharCode(4);

/**
 * Build the dictionary lookup key for a message, optionally disambiguated by a
 * context label. With a context the key is `context<glue>normalizedKey`;
 * without one it is just the normalized key — which is also the fallback the
 * runtime tries when a contextual entry is absent.
 */
export function contextKey(key: string, context?: string): string {
  const normalizedKey = normalizeKey(key);
  const normalizedContext = context?.trim() ?? '';
  return normalizedContext === ''
    ? normalizedKey
    : `${normalizedContext}${CONTEXT_GLUE}${normalizedKey}`;
}
