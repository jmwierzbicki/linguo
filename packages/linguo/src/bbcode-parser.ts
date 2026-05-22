/**
 * A node in a parsed BBCode tree produced by {@link parseBBCode}.
 *
 * - `text` nodes carry literal, translator-authored text. They are rendered as
 *   DOM text nodes — never as HTML — which is how the library keeps its XSS
 *   surface at zero by construction.
 * - `placeholder` nodes correspond to a `[name]...[/name]` region that the
 *   developer binds to an `<ng-template>`. Placeholders may nest.
 */
export type BBCodeNode =
  | { readonly kind: 'text'; readonly value: string }
  | {
      readonly kind: 'placeholder';
      readonly name: string;
      readonly children: readonly BBCodeNode[];
    };

/**
 * Matches a single BBCode tag at the start of a string: an optional leading
 * slash (closing tag) followed by a name. The name grammar
 * (`[a-zA-Z_][a-zA-Z0-9_-]*`) is part of the public contract — see CLAUDE.md
 * §5.1. Changing it is a major version bump.
 */
const TAG_PATTERN = /^\[(\/?)([a-zA-Z_][a-zA-Z0-9_-]*)\]/;

type Token =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'open'; readonly name: string }
  | { readonly kind: 'close'; readonly name: string };

function tokenize(input: string): readonly Token[] {
  const tokens: Token[] = [];
  let buffer = '';

  const flush = (): void => {
    if (buffer.length > 0) {
      tokens.push({ kind: 'text', value: buffer });
      buffer = '';
    }
  };

  let index = 0;
  while (index < input.length) {
    if (input[index] === '[') {
      const match = TAG_PATTERN.exec(input.slice(index));
      if (match) {
        // Defaults satisfy `noUncheckedIndexedAccess` without non-null `!`.
        const [whole, slash = '', name = ''] = match;
        flush();
        tokens.push(slash === '/' ? { kind: 'close', name } : { kind: 'open', name });
        index += whole.length;
        continue;
      }
    }
    // A `[` that does not start a valid tag is ordinary text — malformed input
    // is tolerated rather than throwing, so a stray bracket never breaks a page.
    buffer += input[index];
    index += 1;
  }
  flush();
  return tokens;
}

interface OpenFrame {
  readonly name: string;
  readonly children: BBCodeNode[];
}

function appendText(into: BBCodeNode[], value: string): void {
  const last = into[into.length - 1];
  if (last && last.kind === 'text') {
    into[into.length - 1] = { kind: 'text', value: last.value + value };
  } else {
    into.push({ kind: 'text', value });
  }
}

/**
 * Parse a translator-authored string into a tree of {@link BBCodeNode}s.
 *
 * The parser is total: every input produces a tree, and any malformed
 * construct (a stray `[`, an unclosed tag, a mismatched closing tag) degrades
 * gracefully to literal text rather than throwing. Well-formed
 * `[name]...[/name]` regions — including nested ones — become `placeholder`
 * nodes.
 *
 * @example
 * ```ts
 * parseBBCode('Hello [b]world[/b]!');
 * // [
 * //   { kind: 'text', value: 'Hello ' },
 * //   { kind: 'placeholder', name: 'b', children: [{ kind: 'text', value: 'world' }] },
 * //   { kind: 'text', value: '!' },
 * // ]
 * ```
 */
export function parseBBCode(input: string): readonly BBCodeNode[] {
  const root: BBCodeNode[] = [];
  const stack: OpenFrame[] = [];

  const current = (): BBCodeNode[] => {
    const top = stack.at(-1);
    return top ? top.children : root;
  };

  for (const token of tokenize(input)) {
    if (token.kind === 'text') {
      appendText(current(), token.value);
      continue;
    }
    if (token.kind === 'open') {
      stack.push({ name: token.name, children: [] });
      continue;
    }
    // Closing tag.
    const top = stack.at(-1);
    if (top && top.name === token.name) {
      stack.pop();
      current().push({ kind: 'placeholder', name: top.name, children: top.children });
    } else {
      // No matching open tag: treat the closing tag as literal text.
      appendText(current(), `[/${token.name}]`);
    }
  }

  // Unwind any tags left open at end of input, back into literal text so their
  // contents are still rendered.
  for (let frame = stack.pop(); frame !== undefined; frame = stack.pop()) {
    const parent = current();
    appendText(parent, `[${frame.name}]`);
    for (const child of frame.children) {
      if (child.kind === 'text') {
        appendText(parent, child.value);
      } else {
        parent.push(child);
      }
    }
  }

  return root;
}

function collectText(nodes: readonly BBCodeNode[]): string {
  let text = '';
  for (const node of nodes) {
    text += node.kind === 'text' ? node.value : collectText(node.children);
  }
  return text;
}

/**
 * Flatten a BBCode string to plain text: placeholder tags are dropped and their
 * inner text is kept. This is how the `t` pipe and {@link injectTranslate}
 * render a message containing `[name]...[/name]` placeholders — they return a
 * string, so the markup degrades to text (the `[t]` directive renders the
 * placeholders into templates instead).
 *
 * @example
 * ```ts
 * bbcodeToText('Read the [docs]documentation[/docs] now'); // 'Read the documentation now'
 * ```
 */
export function bbcodeToText(input: string): string {
  return collectText(parseBBCode(input));
}
