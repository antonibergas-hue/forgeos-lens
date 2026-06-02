import { Command } from "@tauri-apps/plugin-shell";
import type { LogEntry, ToolCallDetail } from "./types";

export interface LogStreamHandle {
  kill: () => Promise<void>;
}

// Spawn the long-running `forgeos logs <id> --follow --json` child and stream
// its stdout/stderr line-by-line to `onEntry`. Each JSON line is parsed into
// a LogEntry; plain text lines are wrapped as {kind:"other"}.
export async function startLogStream(
  agentId: string,
  onEntry: (entry: LogEntry) => void
): Promise<LogStreamHandle> {
  const cmd = Command.create("forgeos", ["logs", agentId, "--follow", "--json"]);
  cmd.stdout.on("data", (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const parsed = JSON.parse(trimmed);
      const entry: LogEntry = {
        idx: Date.now(),
        time: parsed.time ?? parsed.timestamp ?? "",
        kind: parsed.kind ?? "other",
        msg: parsed.msg ?? parsed.message ?? JSON.stringify(parsed),
        tool: parsed.tool ?? undefined,
      };
      onEntry(entry);
    } catch {
      // Non-JSON line — treat as plain text log
      onEntry({ idx: Date.now(), time: "", kind: "other", msg: trimmed });
    }
  });
  cmd.stderr.on("data", (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    onEntry({ idx: Date.now(), time: "", kind: "other", msg: trimmed });
  });

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

// ---- Backward compat: string-based adapter for any code still using strings ----
export function entryToString(entry: LogEntry): string {
  if (entry.kind === "tool" && entry.tool) {
    return `[${entry.time}] tool ${entry.msg} (rc=${entry.tool.returncode})`;
  }
  return `[${entry.time}] ${entry.kind} ${entry.msg}`;
}
