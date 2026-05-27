import { Command } from '@tauri-apps/plugin-shell';

export interface ForgeosResult<T> {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  parsed?: T;
}

// Run `forgeos <args>` via the Tauri shell and return the result, parsing
// stdout as JSON when it looks like JSON.
export async function runForgeos<T>(args: string[]): Promise<ForgeosResult<T>> {
  const command = Command.create('forgeos', args);
  const output = await command.execute();
  const ok = output.code === 0;

  let parsed: T | undefined;
  if (ok) {
    const s = output.stdout.trim();
    if (s.startsWith('{') || s.startsWith('[')) {
      try {
        parsed = JSON.parse(s) as T;
      } catch {
        /* not JSON — raw stdout is still returned */
      }
    }
  }

  return { ok, stdout: output.stdout, stderr: output.stderr, code: output.code, parsed };
}
