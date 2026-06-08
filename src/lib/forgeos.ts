import { Command } from '@tauri-apps/plugin-shell';

export interface ForgeosResult<T> {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  parsed?: T;
}

// Parse JSON from stdout when it looks like JSON
function tryParse<T>(stdout: string): T | undefined {
  const s = stdout.trim();
  if (s.startsWith('{') || s.startsWith('[')) {
    try {
      return JSON.parse(s) as T;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// Run `forgeos <args>` via the Tauri shell and return the result, parsing
// stdout as JSON when it looks like JSON.
export async function runForgeos<T>(args: string[]): Promise<ForgeosResult<T>> {
  // Browser-safe: dispatch to fixtures when not running in Tauri
  if (typeof window !== 'undefined' && !(window as any).__TAURI_INTERNALS__) {
    const { MOCK_FIXTURES } = await import('./forgeos.fixtures');
    const key = args[0] + (args.length > 1 ? ' ' + args.slice(1).join(' ') : '');
    const handler = MOCK_FIXTURES[key];
    if (handler) {
      const result = await handler();
      // Parse JSON in browser mode too (mirrors Tauri behavior)
      if (result.ok && result.stdout) {
        result.parsed = tryParse<T>(result.stdout);
      }
      return result as ForgeosResult<T>;
    }
    // Try partial matches (e.g., 'describe agent-1')
    for (const [fixtureKey, fixtureHandler] of Object.entries(MOCK_FIXTURES)) {
      if (key.startsWith(fixtureKey.split(' ')[0])) {
        const result = await fixtureHandler();
        if (result.ok && result.stdout) {
          result.parsed = tryParse<T>(result.stdout);
        }
        return result as ForgeosResult<T>;
      }
    }
    return { ok: false, stderr: `No fixture for: ${key}`, code: 1, stdout: '' } as ForgeosResult<T>;
  }

  const command = Command.create('forgeos', args);
  const output = await command.execute();
  const ok = output.code === 0;

  let parsed: T | undefined;
  if (ok) {
    parsed = tryParse<T>(output.stdout);
  }

  return { ok, stdout: output.stdout, stderr: output.stderr, code: output.code, parsed };
}

export interface ParsedContext {
  name: string;
  current: boolean;
}

// Parse the plain-text table emitted by `forgeos config get-contexts` (there is
// no --json flag on this verb). Table shape:
//   CUR     NAME        AUTH    SERVER
//   ------  ----------  ------  ------------------------------
//   *       cloud-run   bearer  https://…
//           prod        bearer  https://…
export function parseContextsTable(stdout: string): ParsedContext[] {
  const list: ParsedContext[] = [];
  for (const raw of stdout.split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("CUR")) continue; // header
    if (/^-+/.test(trimmed)) continue; // separator
    // The "*" marker lives in the first column; rows without it are
    // left-padded, so detect "current" from the raw (un-trimmed) line.
    const isCurrent = raw.trimStart().startsWith("*");
    const cols = trimmed.split(/\s+/);
    const name = isCurrent ? cols[1] : cols[0];
    if (!name) continue;
    list.push({ name, current: isCurrent });
  }
  return list;
}
