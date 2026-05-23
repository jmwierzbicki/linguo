import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  injectTranslate,
  mark,
  TranslateDirective,
  TranslatePipe,
  TranslateSlot,
  TranslateSlotOutlet,
  TranslateStore,
} from '@ng-linguo/linguo';

import { ExampleCardComponent, type CodeTab } from './components/example-card.component';

/**
 * The playground doubles as living documentation: every feature is shown as an
 * {@link ExampleCardComponent} with an interactive preview plus the source that
 * produced it. ICU messages are stored via `mark()` (not inline at the pipe)
 * because MF2 patterns contain `{{ … }}`, which collides with Angular's own
 * `{{ }}` interpolation; `mark()` is a runtime no-op the extractor still picks up.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TranslatePipe,
    TranslateDirective,
    TranslateSlot,
    TranslateSlotOutlet,
    ExampleCardComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly store = inject(TranslateStore);

  protected readonly currentLang = this.store.currentLang;
  protected readonly isReady = this.store.isReady;

  constructor() {
    // Pick the startup language: persisted → browser → default ('en').
    void this.store.restoreLang();
  }

  // ── Sidebar table of contents ─────────────────────────────────────────────
  // Labels are wrapped in mark() so the extractor sees the source string even
  // though the template reads them through a variable ({{ section.label | t }},
  // which is not statically extractable). 'injectTranslate()' is a bare API name,
  // so it is left unmarked — there is nothing to translate.
  protected readonly sections: ReadonlyArray<{ id: string; label: string }> = [
    { id: 'setup', label: mark('Setup') },
    { id: 'pipe', label: mark('The t pipe') },
    { id: 'directive', label: mark('The [t] directive') },
    { id: 'inject', label: 'injectTranslate()' },
    { id: 'plurals', label: mark('Plurals') },
    { id: 'ordinals', label: mark('Ordinals') },
    { id: 'gender', label: mark('Gender select') },
    { id: 'numbers', label: mark('Number formatting') },
    { id: 'context', label: mark('Context (homonyms)') },
    { id: 'slots', label: mark('Rich text (slots)') },
    { id: 'eslint', label: mark('ESLint & a11y') },
    { id: 'translate', label: mark('Translating with AI') },
  ];

  protected readonly languages: ReadonlyArray<{ code: string; label: string }> = [
    { code: 'en', label: 'English' },
    { code: 'pl', label: 'Polski' },
    { code: 'de', label: 'Deutsch' },
    { code: 'fr', label: 'Français' },
    { code: 'ja', label: '日本語' },
  ];

  // ── Interactive state driving the previews ────────────────────────────────
  protected readonly count = signal(1);
  protected readonly place = signal(1);
  protected readonly gender = signal<'female' | 'male'>('female');
  protected readonly name = signal('Tomek');

  // ── ICU messages (MF2), stored via mark() ─────────────────────────────────
  protected readonly msgFiles = mark(
    '.input {$count :number} .match $count one {{{$count} file}} * {{{$count} files}}',
  );
  protected readonly msgCartItems = mark(
    '.input {$count :number} .match $count one {{{$count} item in your cart}} * {{{$count} items in your cart}}',
  );

  /** Plural with an exact `0` variant — "No new messages" reads better than "0". */
  protected readonly msgUnread = mark(
    '.input {$count :number} .match $count 0 {{No new messages}} one {{{$count} new message}} * {{{$count} new messages}}',
  );

  /** Ordinal: EN st/nd/rd/th (one/two/few/other) vs PL & DE plain "{n}." */
  protected readonly msgRank = mark(
    '.input {$place :number select=ordinal} .match $place one {{You finished {$place}st}} two {{You finished {$place}nd}} few {{You finished {$place}rd}} * {{You finished {$place}th}}',
  );

  /** Gender select: EN swaps the pronoun; PL swaps the (gendered) past-tense verb. */
  protected readonly msgInvited = mark(
    '.input {$gender :string} .match $gender female {{She invited you}} male {{He invited you}} * {{They invited you}}',
  );

  /** Two selectors at once (count × gender) — the cross-product differs per language. */
  // prettier-ignore
  protected readonly msgFollowers = mark(
    '.input {$count :number} .input {$gender :string} .match $count $gender one female {{She has {$count} follower}} one male {{He has {$count} follower}} * female {{She has {$count} followers}} * male {{He has {$count} followers}} * * {{They have {$count} followers}}',
  );

  /** Number grouping is locale-driven: 1,234,567 / 1.234.567 / 1 234 567. */
  protected readonly msgPopulation = mark('This city has {$n :number} residents');

  /** Simple placeholder whose position moves to clause-final in German. */
  protected readonly msgDownload = mark('Click the button to download {$file}');

  protected readonly greeting = mark('Hello {$name}!');

  /** The `t` pipe's TypeScript counterpart — reactive when read in a computed. */
  private readonly t = injectTranslate();
  protected readonly greetingFromTs = computed(() =>
    this.t('Hello {$name}!', { params: { name: this.name() } }),
  );

  // ── Code samples shown in each card's tabs ────────────────────────────────
  // These strings document the API (pipe, directive, and mark snippets), so they
  // are NOT real messages. The linguo-ignore-start/end pair below keeps the
  // extractor from scanning them — without it they become junk catalog entries.
  // linguo-ignore-start
  protected readonly setupTabs: CodeTab[] = [
    {
      label: 'app.config.ts',
      lang: 'typescript',
      code: `import { provideTranslate } from '@ng-linguo/linguo';
import { createHttpLoader } from '@ng-linguo/linguo/http';
import { provideIcu } from '@ng-linguo/linguo/icu';

export const appConfig: ApplicationConfig = {
  providers: [
    provideTranslate({
      defaultLang: 'en',
      supportedLangs: ['en', 'pl', 'de'],
      // persistSelectedLanguage + detectBrowserLanguage default to true:
      // restoreLang() picks persisted → browser → defaultLang.
      loader: () => createHttpLoader({ prefix: '/i18n/' }),
    }),
    provideIcu({ defaultFormat: 'mf2' }),
  ],
};`,
    },
    {
      label: 'app.ts',
      lang: 'typescript',
      code: `export class App {
  private readonly store = inject(TranslateStore);

  // Public state is exposed as signals — no Observables, no async pipe.
  readonly currentLang = this.store.currentLang; // Signal<string>
  readonly isReady = this.store.isReady;         // Signal<boolean>

  constructor() {
    void this.store.restoreLang();
  }

  setLang(lang: string) {
    void this.store.setLang(lang);
  }
}`,
    },
    {
      label: 'public/i18n/en.json',
      lang: 'json',
      code: `{
  "He was driving incredibly fast!": "He was driving incredibly fast!",
  "Hello {$name}!": "Hello {$name}!"
}`,
    },
  ];

  protected readonly pipeTabs: CodeTab[] = [
    {
      label: 'Template',
      lang: 'html',
      code: `<!-- The source string is the key; translators edit the value. -->
<p>{{ 'He was driving incredibly fast!' | t }}</p>`,
    },
    {
      label: 'In a binding',
      lang: 'html',
      code: `<!-- The pipe isn't limited to {{ }} — it works in a property binding too.
     That's how the card titles and descriptions on this very page translate. -->
<app-example-card [title]="'Bootstrap the store' | t" />

<!-- Mind the quotes. Three layers nest inside one attribute: the HTML attribute
     ("…"), the Angular expression, and the string-literal key ('…'). The
     attribute already owns the double quote, so the key must use single quotes —
     which means an apostrophe in the text collides with that delimiter and has
     to be escaped as \\': -->
<app-example-card [description]="'Reads the store\\'s signals' | t" />

<!-- No such friction with the [t] directive (a plain attribute — one quote
     layer) or with a mark()'d constant bound by name. Prefer either of those
     when the text contains apostrophes. -->`,
    },
    {
      label: 'JSON',
      lang: 'json',
      code: `// en.json
{ "He was driving incredibly fast!": "He was driving incredibly fast!" }

// pl.json
{ "He was driving incredibly fast!": "Jechał niesamowicie szybko!" }`,
    },
  ];

  protected readonly directiveTabs: CodeTab[] = [
    {
      label: 'Template',
      lang: 'html',
      code: `<!-- The [t] directive renders into the element's text content. Use it
     when the translation needs an element to live in (and for slot tags). -->
<p t="He was driving incredibly fast!"></p>`,
    },
  ];

  protected readonly injectTabs: CodeTab[] = [
    {
      label: 'TypeScript',
      lang: 'typescript',
      code: `private readonly t = injectTranslate();
readonly name = signal('Tomek');

// Reactive: re-runs when name() OR the active language changes.
readonly greeting = computed(() =>
  this.t('Hello {$name}!', { params: { name: this.name() } }),
);`,
    },
  ];

  protected readonly pluralTabs: CodeTab[] = [
    {
      label: 'Template',
      lang: 'html',
      code: `<li>{{ msgFiles | t: { params: { count: count() } } }}</li>
<li>{{ msgCartItems | t: { params: { count: count() } } }}</li>
<li>{{ msgUnread | t: { params: { count: count() } } }}</li>`,
    },
    {
      label: 'TypeScript',
      lang: 'typescript',
      code: `readonly count = signal(1);

// MF2 stored via mark() so its {{ }} doesn't clash with Angular interpolation.
readonly msgFiles = mark(
  '.input {$count :number} .match $count one {{{$count} file}} * {{{$count} files}}',
);
readonly msgCartItems = mark(
  '.input {$count :number} .match $count one {{{$count} item in your cart}} * {{{$count} items in your cart}}',
);
// An exact 0 variant reads better than "0 new messages".
readonly msgUnread = mark(
  '.input {$count :number} .match $count 0 {{No new messages}} one {{{$count} new message}} * {{{$count} new messages}}',
);`,
    },
    {
      label: 'JSON',
      lang: 'json',
      code: `// pl.json — Polish needs four plural categories where English needs two.
{
  ".input {$count :number} .match $count one {{{$count} file}} * {{{$count} files}}":
    ".input {$count :number} .match $count one {{{$count} plik}} few {{{$count} pliki}} many {{{$count} plików}} * {{{$count} pliku}}"
}`,
    },
  ];

  protected readonly ordinalTabs: CodeTab[] = [
    {
      label: 'Template',
      lang: 'html',
      code: `<!-- via the t pipe -->
<p>{{ msgRank | t: { params: { place: place() } } }}</p>

<!-- via the [t] directive — [t] is bound, not a static attribute,
     because the MF2 message contains { } -->
<p [t]="msgRank" [tParams]="{ place: place() }"></p>`,
    },
    {
      label: 'TypeScript',
      lang: 'typescript',
      code: `readonly msgRank = mark(
  '.input {$place :number select=ordinal} .match $place ' +
    'one {{You finished {$place}st}} two {{You finished {$place}nd}} ' +
    'few {{You finished {$place}rd}} * {{You finished {$place}th}}',
);`,
    },
  ];

  protected readonly genderTabs: CodeTab[] = [
    {
      label: 'Template',
      lang: 'html',
      code: `<p>{{ msgInvited | t: { params: { gender: gender() } } }}</p>
<!-- Two selectors at once: count × gender. -->
<p>{{ msgFollowers | t: { params: { count: count(), gender: gender() } } }}</p>`,
    },
    {
      label: 'TypeScript',
      lang: 'typescript',
      code: `readonly msgInvited = mark(
  '.input {$gender :string} .match $gender ' +
    'female {{She invited you}} male {{He invited you}} * {{They invited you}}',
);

// count × gender — the cross-product differs per language.
readonly msgFollowers = mark(
  '.input {$count :number} .input {$gender :string} .match $count $gender' +
    ' one female {{She has {$count} follower}} one male {{He has {$count} follower}}' +
    ' * female {{She has {$count} followers}} * male {{He has {$count} followers}}' +
    ' * * {{They have {$count} followers}}',
);`,
    },
    {
      label: 'JSON',
      lang: 'json',
      code: `// pl.json — Polish swaps the gendered past-tense verb.
{
  ".input {$gender :string} .match $gender female {{She invited you}} male {{He invited you}} * {{They invited you}}":
    ".input {$gender :string} .match $gender female {{Zaprosiła Cię}} male {{Zaprosił Cię}} * {{Zaproszono Cię}}"
}`,
    },
  ];

  protected readonly numberTabs: CodeTab[] = [
    {
      label: 'Template',
      lang: 'html',
      code: `<p>{{ msgPopulation | t: { params: { n: 1234567 } } }}</p>`,
    },
    {
      label: 'TypeScript',
      lang: 'typescript',
      code: `// Grouping separators follow the locale automatically:
// en 1,234,567 · de 1.234.567 · pl 1 234 567
readonly msgPopulation = mark('This city has {$n :number} residents');`,
    },
  ];

  protected readonly contextTabs: CodeTab[] = [
    {
      label: 'Template',
      lang: 'html',
      code: `<!-- Same source word, different meaning ⇒ different translation.
     'context' is part of the key (gettext msgctxt) and doubles as a note. -->
<li>{{ 'Play' | t: { context: 'audio player' } }} / {{ 'Play' | t: { context: 'game' } }}</li>
<li>{{ 'Right' | t: { context: 'direction' } }} / {{ 'Right' | t: { context: 'correct' } }}</li>
<li>{{ 'Order' | t: { context: 'sequence' } }} / {{ 'Order' | t: { context: 'purchase' } }}</li>
<li>{{ 'Free' | t: { context: 'no cost' } }} / {{ 'Free' | t: { context: 'available' } }}</li>`,
    },
    {
      label: 'JSON',
      lang: 'json',
      code: `// pl.json — the \\u0004 separator joins context to the source string.
{
  "audio player\\u0004Play": "Odtwórz",
  "game\\u0004Play": "Graj",
  "direction\\u0004Right": "Prawo",
  "correct\\u0004Right": "Poprawnie",
  "sequence\\u0004Order": "Kolejność",
  "purchase\\u0004Order": "Zamów",
  "no cost\\u0004Free": "Bezpłatnie",
  "available\\u0004Free": "Wolny"
}`,
    },
  ];

  protected readonly slotTabs: CodeTab[] = [
    {
      label: 'Template',
      lang: 'html',
      code: `<!-- Translators see [docs]…[/docs], never HTML. Each tag binds to an
     <ng-template tFor>; word order (and tag position) can differ per language. -->
<p t="Read the [docs]documentation[/docs] to get started">
  <ng-template tFor="docs" let-text>
    <a href="https://nx.dev" target="_blank" rel="noreferrer">{{ text }}</a>
  </ng-template>
</p>

<p t="By continuing you agree to our [terms]Terms of Service[/terms]">
  <ng-template tFor="terms" let-text>
    <a href="/terms">{{ text }}</a>
  </ng-template>
</p>

<p t="[warn]Warning:[/warn] this action cannot be undone">
  <ng-template tFor="warn" let-text>
    <strong>{{ text }}</strong>
  </ng-template>
</p>

<!-- Need a literal bracket? Double the opening one: [[ renders a single [.
     Here [[b]…[[/b] stays as text while [b]…[/b] binds the slot. -->
<p t="Escaped [[b]bold[[/b] stays literal — [b]this[/b] is a slot">
  <ng-template tFor="b" let-text><strong>{{ text }}</strong></ng-template>
</p>`,
    },
    {
      label: 'Nesting',
      lang: 'html',
      code: `<!-- A slot inside a slot. *tRender renders the parent slot's children,
     so the nested [b] binds its own template instead of flattening to text.
     Bind the children from the slot context with let-kids="children". -->
<p t="Agree to our [link]Terms and [b]Conditions[/b][/link]">
  <ng-template tFor="link" let-kids="children">
    <a href="/terms"><ng-container *tRender="kids"></ng-container></a>
  </ng-template>
  <ng-template tFor="b" let-text><strong>{{ text }}</strong></ng-template>
</p>`,
    },
    {
      label: 'JSON',
      lang: 'json',
      code: `// pl.json — only the wrapped text is translated; the [tags] stay put.
{
  "Read the [docs]documentation[/docs] to get started":
    "Przeczytaj [docs]dokumentację[/docs], aby rozpocząć",
  "By continuing you agree to our [terms]Terms of Service[/terms]":
    "Kontynuując, akceptujesz nasz [terms]regulamin[/terms]",
  "[warn]Warning:[/warn] this action cannot be undone":
    "[warn]Ostrzeżenie:[/warn] tej czynności nie można cofnąć",
  // Nested: the [b] inside [link] is preserved, and the bold word moves to the
  // front in Polish — word order is the translator's to choose.
  "Agree to our [link]Terms and [b]Conditions[/b][/link]":
    "Zaakceptuj nasze [link][b]Warunki[/b] korzystania[/link]"
}`,
    },
  ];

  protected readonly eslintTabs: CodeTab[] = [
    {
      label: 'eslint.config.mjs',
      lang: 'typescript',
      code: `// The preset (recommended). Spread it AFTER the @angular-eslint
// template config so its options win.
import angular from 'angular-eslint';
import linguo from '@ng-linguo/eslint-plugin';

export default [
  ...angular.configs.templateRecommended,
  linguo.configs.recommended, // safelists 't' on elements-content
];`,
    },
    {
      label: 'By hand',
      lang: 'typescript',
      code: `// Same effect, no dependency: extend the rule's safelist yourself.
// 'allowList' adds to the built-in safelist (aria-label, title, …).
{
  files: ['**/*.html'],
  rules: {
    '@angular-eslint/template/elements-content': [
      'error',
      { allowList: ['t'] },
    ],
  },
}`,
    },
    {
      label: 'No config',
      lang: 'html',
      code: `<!-- Or skip the rule entirely: give the element its source text.
     The directive strips it on init and renders the translation —
     and it shows before the dictionary loads, so it doubles as a
     no-flash / SSR fallback. The hero heading above does exactly this. -->
<h2 t="Setup">Setup</h2>`,
    },
  ];

  protected readonly translateTabs: CodeTab[] = [
    {
      label: 'Workflow',
      lang: 'bash',
      code: `# 1. Scan source → create/update the <locale>.po catalogs
linguo-extract extract

# 2a. Manual — copy a prompt for any chat model (no API key, no config)
linguo-extract copyprompt pl       # → clipboard; paste the reply over pl.po

# 2b. Automatic — call your own translator function (see the other tabs)
linguo-extract translate --locale pl
linguo-extract translate --all     # every language with missing entries

# 3. Compile the .po catalogs → the runtime JSON the app loads
linguo-extract compile

# Or just run the guided menu (it offers both manual and automatic):
linguo-extract`,
    },
    {
      label: 'linguo.config.json',
      lang: 'json',
      code: `{
  // $schema gives your editor autocomplete, hover docs, and validation.
  "$schema": "./node_modules/@ng-linguo/extract/linguo.config.schema.json",
  "locales": ["en", "pl", "de"],
  "sourceLocale": "en",
  "catalogs": "i18n",
  "output": "public/i18n",
  "translator": "./linguo.translator.mjs"
}`,
    },
    {
      label: 'linguo.translator.mjs',
      lang: 'typescript',
      code: `// This playground uses Google Gemini. You own the API call, the model, and
// the secret; ng-linguo builds the prompt (context + slot tags + MF2 rules)
// and merges the reply. Swap in any provider — only this file changes.
import { GoogleGenAI } from '@google/genai';

// Built into Node 20.12+/22 — loads apps/playground/.env, no dotenv needed.
process.loadEnvFile(new URL('.env', import.meta.url));

/** @param {{ prompt: string, targetLocale: string, targetLabel: string }} req */
export async function translate(req) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: req.prompt,
    config: { temperature: 0 }, // deterministic catalogs
  });
  if (!res.text) throw new Error('Empty reply for ' + req.targetLabel);
  return res.text;
}`,
    },
    {
      label: '.env',
      lang: 'bash',
      code: `# .env is gitignored — never commit a key. Get one at
# https://aistudio.google.com/apikey
GEMINI_API_KEY=your-key-here`,
    },
  ];

  // linguo-ignore-end

  protected setLang(lang: string): void {
    void this.store.setLang(lang);
  }

  protected addCount(delta: number): void {
    this.count.update((n) => Math.max(0, n + delta));
  }

  protected addPlace(delta: number): void {
    this.place.update((n) => Math.max(1, n + delta));
  }

  protected toggleGender(): void {
    this.gender.update((g) => (g === 'female' ? 'male' : 'female'));
  }
}
