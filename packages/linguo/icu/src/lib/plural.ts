/**
 * The CLDR plural categories. A given locale uses a subset of these; English,
 * for example, only distinguishes `'one'` and `'other'`.
 */
export type PluralCategory = Intl.LDMLPluralRule;

/**
 * Select the CLDR plural category for `count` in `locale`, used to pick the
 * correct ICU plural branch.
 *
 * Backed by the platform `Intl.PluralRules`, so it has no Angular dependency
 * and runs anywhere ICU formatting is needed. The locale is always explicit —
 * the runtime never reads the ambient browser locale.
 *
 * @example
 * ```ts
 * selectPlural(1, 'en');  // 'one'
 * selectPlural(5, 'en');  // 'other'
 * ```
 */
export function selectPlural(count: number, locale: string): PluralCategory {
  return new Intl.PluralRules(locale).select(count);
}
