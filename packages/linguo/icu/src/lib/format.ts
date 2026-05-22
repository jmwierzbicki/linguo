import { IntlMessageFormat } from 'intl-messageformat';
import { MessageFormat } from 'messageformat';

/**
 * Which ICU message syntax a message is written in.
 *
 * - `'mf2'` — Unicode MessageFormat 2.0 (`.input`/`.match`/`{$var :number}`),
 *   the default and future-facing format.
 * - `'mf1'` — classic ICU MessageFormat (`{count, plural, one {#} other {#}}`),
 *   what most existing translation tooling emits today.
 */
export type MessageFormatVersion = 'mf2' | 'mf1';

/**
 * Arguments substituted into a message. Values are the primitives the ICU
 * formatters accept (numbers for plurals/number formatting, strings for
 * `select`, `Date` for date/time).
 */
export type IcuArgs = Record<string, string | number | boolean | Date | null | undefined>;

/** Options for {@link formatMessage}. */
export interface FormatMessageOptions {
  /** BCP-47 locale used for plural rules and number/date formatting. */
  readonly locale: string;
  /** Message syntax to parse. Defaults to `'mf2'`. */
  readonly format?: MessageFormatVersion;
}

const SEP = String.fromCharCode(0);
const compilers = new Map<string, (args: IcuArgs) => string>();

function compile(
  message: string,
  locale: string,
  format: MessageFormatVersion,
): (args: IcuArgs) => string {
  const cacheKey = `${format}${SEP}${locale}${SEP}${message}`;
  const cached = compilers.get(cacheKey);
  if (cached) {
    return cached;
  }

  let render: (args: IcuArgs) => string;
  if (format === 'mf1') {
    const mf = new IntlMessageFormat(message, locale);
    render = (args) => {
      const result = mf.format(args);
      return Array.isArray(result) ? result.join('') : String(result);
    };
  } else {
    // Disable bidi isolation so output is plain text (no invisible U+2068/U+2069
    // marks around placeholders), matching MF1 and keeping output predictable.
    const mf = new MessageFormat(locale, message, { bidiIsolation: 'none' });
    render = (args) => mf.format(args);
  }

  compilers.set(cacheKey, render);
  return render;
}

/**
 * Format an ICU message against `args` for a locale.
 *
 * Defaults to MessageFormat 2.0; pass `format: 'mf1'` for classic ICU. Compiled
 * messages are memoized per `(format, locale, message)`. On a malformed or
 * unsupported pattern the raw message is returned rather than throwing, so a
 * bad string never breaks the view.
 *
 * @example
 * ```ts
 * formatMessage('{n, plural, one {# file} other {# files}}', { n: 3 }, { locale: 'en', format: 'mf1' });
 * // '3 files'
 * ```
 */
export function formatMessage(
  message: string,
  args: IcuArgs,
  options: FormatMessageOptions,
): string {
  try {
    return compile(message, options.locale, options.format ?? 'mf2')(args);
  } catch {
    return message;
  }
}
