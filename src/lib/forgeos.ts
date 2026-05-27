
import { Command } from '@tauri-apps/api/shell';

export interface ForgeosResult<T> {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number | null;
  parsed?: T;
}

export async function runForgeos<T>(args: string[]): Promise<ForgeosResult<T>> {
  // For now, we assume 'forgeos' is in the path.
  // We can later enhance this to use a bundled binary.
  const command = new Command('forgeos', args);

  let stdout = '';
  let stderr = '';

  const child = await command.spawn();

  // We can't easily use command.stdout.on('data', ...) because it's not available in this context.
  // Instead, we'll get the full output when the process exits.
  // This is less ideal for streaming, but fine for most commands.
  // For streaming logs, we'll need a different approach.

  const output = await command.execute();


  if (output.code === 0) {
    let parsed: T | undefined;
    try {
      if (output.stdout.startsWith('{') || output.stdout.startsWith('[')) {
        parsed = JSON.parse(output.stdout) as T;
      }
    } catch (e) {
      console.error("Failed to parse forgeos stdout:", e);
      // Not a fatal error, the raw stdout is still available.
    }
    return {
      ok: true,
      stdout: output.stdout,
      stderr: output.stderr,
      code: output.code,
      parsed,
    };
  } else {
    return {
      ok: false,
      stdout: output.stdout,
      stderr: output.stderr,
      code: output.code,
    };
  }
}
