/**
 * Mark a string as a translatable message so `@ng-linguo/extract` collects it,
 * returning the string unchanged (it does not translate at runtime).
 *
 * Use it for messages that are not written inline at a `translate`/`icu` pipe or
 * `[translate]` directive — for example an ICU message kept in a component field
 * (an ICU plural contains `}}`, which cannot be inlined in a `{{ }}` binding).
 * The marked string is still translated at render time by the pipe/directive
 * that consumes it.
 *
 * @example
 * ```ts
 * readonly fileCount = mark('{count, plural, one {# file} other {# files}}');
 * // template: {{ fileCount | icu: { count: count() } : 'mf1' }}
 * ```
 */
export function mark(message: string): string {
  return message;
}
