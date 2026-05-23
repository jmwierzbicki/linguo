/**
 * Options for {@link mark}. Only `context` is read (by `@ng-linguo/extract`);
 * `params` is accepted so a single options object can be shared with the `t`
 * pipe / directive call that ultimately renders the message.
 */
export interface MarkOptions {
  /**
   * Disambiguating/contextual text recorded as the catalog `msgctxt`. It is part
   * of the key, so it must match the `context` passed at the consuming
   * pipe/directive for the runtime lookup to resolve. It doubles as a note for
   * translators (e.g. `'file = a document on disk'`).
   */
  readonly context?: string;
}

/**
 * Mark a string as a translatable message so `@ng-linguo/extract` collects it,
 * returning the string unchanged (it does not translate at runtime).
 *
 * Use it for messages that are not written inline at a `t` pipe or `[t]`
 * directive — for example an ICU message kept in a component field (an MF2
 * pattern contains `{{ … }}`, which collides with Angular's `{{ }}` binding).
 * The marked string is still translated at render time by the pipe/directive
 * that consumes it.
 *
 * Pass `context` to record a `msgctxt`/translator note for the entry. Because
 * context is part of the key, the **same** `context` must be supplied where the
 * marked string is rendered (`| t: { context }` or `tContext`), or the runtime
 * lookup will not find the contextual entry.
 *
 * @example
 * ```ts
 * readonly fileCount = mark(
 *   '.input {$count :number} .match $count one {{{$count} file}} * {{{$count} files}}',
 *   { context: 'file = a document on disk' },
 * );
 * // template: {{ fileCount | t: { params: { count: count() }, context: 'file = a document on disk' } }}
 * ```
 */
export function mark(message: string, options?: MarkOptions): string {
  // `options` is read only by the extractor (statically); at runtime it is a
  // no-op, so the parameter is intentionally unused here.
  void options;
  return message;
}
