import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { MESSAGE_FORMATTER, type MessageFormatter } from '@ng-linguo/linguo';

import { formatMessage, type IcuArgs, type MessageFormatVersion } from './format';

/**
 * Enable ICU message formatting for the `translate` pipe.
 *
 * Add it next to `provideTranslate`. Once provided, any `translate` call given
 * an arguments object formats the message as ICU — consumers never touch a
 * separate ICU pipe or the formatter directly. Defaults to MessageFormat 2.0;
 * pass `{ defaultFormat: 'mf1' }` for classic ICU.
 *
 * @example
 * ```ts
 * bootstrapApplication(App, {
 *   providers: [
 *     provideTranslate({ defaultLang: 'en', loader }),
 *     provideIcu(),
 *   ],
 * });
 * // template: {{ '{count, plural, one {# file} other {# files}}' | translate: { count } }}
 * ```
 */
export function provideIcu(config?: {
  defaultFormat?: MessageFormatVersion;
}): EnvironmentProviders {
  const format = config?.defaultFormat ?? 'mf2';
  const formatter: MessageFormatter = {
    format: (message, args, locale) => formatMessage(message, args as IcuArgs, { locale, format }),
  };
  return makeEnvironmentProviders([{ provide: MESSAGE_FORMATTER, useValue: formatter }]);
}
