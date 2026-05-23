// Copies the canonical root README.md into the @ng-linguo/linguo package so the
// npm landing page is identical to the GitHub landing page. The repo-internal
// links in the root README are absolute GitHub URLs precisely so this verbatim
// copy renders correctly on npm too. Wired to run before the linguo build (see
// packages/linguo/project.json) — always edit /README.md, never the generated copy.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(repoRoot, 'README.md');
const dest = join(repoRoot, 'packages', 'linguo', 'README.md');

const header = [
  '<!--',
  '  GENERATED FILE — do not edit.',
  '  Synced from the repository root README.md by tools/sync-readme.mjs.',
  '  Edit /README.md instead; this copy is regenerated on every linguo build.',
  '-->',
  '',
  '',
].join('\n');

writeFileSync(dest, header + readFileSync(source, 'utf8'));
console.log(`Synced README.md → ${dest.replace(repoRoot, '.')}`);
