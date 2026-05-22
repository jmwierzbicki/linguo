import { TestBed } from '@angular/core/testing';
import { MESSAGE_FORMATTER } from '@ng-linguo/linguo';

import { provideIcu } from './provide-icu';

function formatterFrom(providers: unknown[]) {
  TestBed.configureTestingModule({ providers: providers as never[] });
  return TestBed.inject(MESSAGE_FORMATTER);
}

describe('provideIcu', () => {
  it('provides a formatter that defaults to MessageFormat 2.0', () => {
    const formatter = formatterFrom([provideIcu()]);
    expect(formatter.format('Hello {$name}!', { name: 'Ada' }, 'en')).toBe('Hello Ada!');
  });

  it('honours a default format of mf1', () => {
    const formatter = formatterFrom([provideIcu({ defaultFormat: 'mf1' })]);
    expect(formatter.format('{n, plural, one {# file} other {# files}}', { n: 5 }, 'en')).toBe(
      '5 files',
    );
  });
});
