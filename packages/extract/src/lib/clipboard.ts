import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Copy text to the OS clipboard via the platform's native tool, so we add no
 * runtime dependency for this. On Windows we round-trip through a UTF-8 temp
 * file so `Set-Clipboard` preserves accented characters (piping to `clip`
 * mangles them under the legacy code page).
 *
 * @returns whether a clipboard tool succeeded.
 */
export function copyToClipboard(text: string): boolean {
  try {
    if (process.platform === 'win32') {
      const tmp = join(tmpdir(), `linguo-prompt-${process.pid}.txt`);
      writeFileSync(tmp, text, 'utf8');
      try {
        const res = spawnSync(
          'powershell',
          [
            '-NoProfile',
            '-Command',
            `Set-Clipboard -Value (Get-Content -Raw -Encoding UTF8 -LiteralPath '${tmp}')`,
          ],
          { stdio: 'ignore' },
        );
        return !res.error && res.status === 0;
      } finally {
        rmSync(tmp, { force: true });
      }
    }

    const tools: ReadonlyArray<readonly [string, readonly string[]]> =
      process.platform === 'darwin'
        ? [['pbcopy', []]]
        : [
            ['wl-copy', []],
            ['xclip', ['-selection', 'clipboard']],
            ['xsel', ['--clipboard', '--input']],
          ];
    for (const [cmd, args] of tools) {
      const res = spawnSync(cmd, [...args], { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
      if (!res.error && res.status === 0) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Read text from the OS clipboard via the platform's native tool. On Windows we
 * write it to a UTF-8 (no-BOM) temp file with `[IO.File]::WriteAllText` rather
 * than `Out-File`, which would wrap long lines and corrupt long `.po` entries.
 *
 * @returns the clipboard text, or `undefined` if it could not be read.
 */
export function readClipboard(): string | undefined {
  try {
    if (process.platform === 'win32') {
      const tmp = join(tmpdir(), `linguo-paste-${process.pid}.txt`);
      const script =
        `$c = Get-Clipboard -Raw; if ($null -eq $c) { $c = '' }; ` +
        `[IO.File]::WriteAllText('${tmp}', $c, (New-Object System.Text.UTF8Encoding($false)))`;
      const res = spawnSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore' });
      if (res.error || res.status !== 0) {
        return undefined;
      }
      try {
        return readFileSync(tmp, 'utf8');
      } finally {
        rmSync(tmp, { force: true });
      }
    }

    const tools: ReadonlyArray<readonly [string, readonly string[]]> =
      process.platform === 'darwin'
        ? [['pbpaste', []]]
        : [
            ['wl-paste', []],
            ['xclip', ['-selection', 'clipboard', '-o']],
            ['xsel', ['--clipboard', '--output']],
          ];
    for (const [cmd, args] of tools) {
      const res = spawnSync(cmd, [...args], { encoding: 'utf8' });
      if (!res.error && res.status === 0 && typeof res.stdout === 'string') {
        return res.stdout;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}
