import { Command } from '@tauri-apps/plugin-shell';

export interface ForgeosResult<T> {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  parsed?: T;
}

// True when the page is running inside a Tauri window. When it's running
// in a plain browser (Playwright driving the Vite dev URL during smoke
// tests) we route to fixtures instead — see src/lib/forgeos.fixtures.ts.
const inTauri = (): boolean =>
  typeof window !== 'undefined' &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Boolean((window as any).__TAURI_INTERNALS__);

// Run `forgeos <args>` via the Tauri shell and return the result, parsing
// stdout as JSON when it looks like JSON.
export async function runForgeos<T>(args: string[]): Promise<ForgeosResult<T>> {
  if (!inTauri()) {
    // Lazy-import so production Tauri bundles never download the fixtures
    // chunk; Vite code-splits this dynamic import.
    const { fixtureRunForgeos } = await import('./forgeos.fixtures');
    return fixtureRunForgeos<T>(args);
  }
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
