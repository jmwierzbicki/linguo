/**
 * Normalize a translator-facing source message into its canonical form.
 *
 * Leading/trailing whitespace is trimmed and any internal run of whitespace
 * (including newlines from multi-line templates) is collapsed to a single
 * space. This is the build-time half of the runtime/extractor parity contract
 * (CLAUDE.md §5.2): the runtime normalizer must produce identical output for
 * the same input, verified against the shared fixture.
 *
 * @example
 * ```ts
 * normalizeMessage('  Hello\n   world  '); // 'Hello world'
 * ```
 */
export function normalizeMessage(source: string): string {
  return source.trim().replace(/\s+/g, ' ');
}
