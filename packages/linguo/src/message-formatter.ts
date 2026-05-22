import { InjectionToken } from '@angular/core';

/**
 * Formats a resolved message against runtime arguments — the seam that lets the
 * `translate` pipe render ICU messages without `core` depending on any ICU
 * library. `@ng-linguo/icu`'s `provideIcu` supplies an implementation; when none
 * is provided the pipe simply returns the message unformatted.
 */
export interface MessageFormatter {
  /**
   * @param message The resolved (translated) message, possibly containing ICU
   *   placeholders.
   * @param args Named arguments to substitute (counts, names, dates…).
   * @param locale BCP-47 locale for plural rules and number/date formatting.
   */
  format(message: string, args: Record<string, unknown>, locale: string): string;
}

/**
 * DI token for an optional {@link MessageFormatter}. Provided by
 * `@ng-linguo/icu`'s `provideIcu`; absent by default.
 */
export const MESSAGE_FORMATTER = new InjectionToken<MessageFormatter>(
  'ng-linguo.message-formatter',
);
