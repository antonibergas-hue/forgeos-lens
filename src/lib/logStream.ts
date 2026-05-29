import { Command } from "@tauri-apps/plugin-shell";

export interface LogStreamHandle {
  kill: () => Promise<void>;
}

// Spawn the long-running `forgeos logs <id> --follow` child and stream its
// stdout/stderr line-by-line to `onLine`. The returned handle's kill() must be
// called on agent switch / tab unmount / window close so the child dies.
// Same Tauri-runtime detection as runForgeos — see src/lib/forgeos.ts.
const inTauri = (): boolean =>
  typeof window !== "undefined" &&
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Boolean((window as any).__TAURI_INTERNALS__);

export async function startLogStream(
  agentId: string,
  onLine: (line: string) => void
): Promise<LogStreamHandle> {
  if (!inTauri()) {
    const { fixtureStartLogStream } = await import("./forgeos.fixtures");
    return fixtureStartLogStream(agentId, onLine);
  }
  const cmd = Command.create("forgeos", ["logs", agentId, "--follow"]);
  cmd.stdout.on("data", (line: string) => onLine(line));
  cmd.stderr.on("data", (line: string) => onLine(line));

  const child = await cmd.spawn();
  return {
    kill: async () => {
      try {
        await child.kill();
      } catch {
        /* already gone */
      }
    },
  };
}
