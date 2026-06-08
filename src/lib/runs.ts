import { runForgeos } from "./forgeos";
import type { AgentRun } from "./types";

export interface RecentRunsResult {
  runs: AgentRun[];
  // false when the CLI has no backing for run history at all.
  supported: boolean;
  error?: string;
}

// Parse the (possibly JSONL) stdout of `forgeos logs <id> --json` into event
// objects. The CLI emits one JSON object per line; the test fixtures join the
// same objects with newlines, so both paths converge here.
function parseEvents(stdout: string): any[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];
  // Whole-buffer JSON array (some emitters batch).
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      return Array.isArray(arr) ? arr : [];
    } catch {
      /* fall through to line-by-line */
    }
  }
  const events: any[] = [];
  for (const line of trimmed.split("\n")) {
    const l = line.trim();
    if (!l) continue;
    try {
      events.push(JSON.parse(l));
    } catch {
      /* skip non-JSON lines */
    }
  }
  return events;
}

const kindOf = (e: any): string => String(e.kind ?? e.type ?? "").toLowerCase();
const timeOf = (e: any): string => e.time ?? e.timestamp ?? e.ts ?? "";

function durationMs(start: string, end: string): number {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return b - a;
}

// Fold a flat event stream (run start/end + tool calls) into discrete runs.
// A "started" event opens a run; the next "completed"/"failed" closes it. A
// terminal event with no open run is treated as an instantaneous run so nothing
// is silently dropped.
export function foldRuns(agentId: string, events: any[]): AgentRun[] {
  const runs: AgentRun[] = [];
  let open: AgentRun | null = null;
  let n = 0;

  const isStart = (k: string) => k.includes("start");
  const isFail = (k: string) => k.includes("fail") || k.includes("error");
  const isDone = (k: string) =>
    k.includes("complete") || k.includes("finish") || k.includes("end") || k.includes("done");
  // Runtime-v2 durable suspend/resume (e.g. execution.suspend_human / .resume).
  const isSuspend = (k: string) => k.includes("suspend") || k.includes("awaiting");
  const isResume = (k: string) => k.includes("resume");

  for (const e of events) {
    const k = kindOf(e);
    const t = timeOf(e);
    if (isStart(k)) {
      if (open) runs.push(open); // unterminated previous run
      open = {
        run_id: e.run_id ?? `${agentId}-run-${++n}`,
        agent_id: agentId,
        status: "running",
        started_at: t,
        duration_ms: 0,
      };
    } else if (isResume(k) && !isFail(k) && !isDone(k)) {
      // Resume comes before its terminal; re-open the run as running.
      if (open) open.status = "running";
    } else if (isSuspend(k)) {
      // The run parked on a human approval — surface it as paused, not "running
      // forever". Keep the run open so a later resume/terminal still closes it.
      if (open) {
        open.status = "paused";
        open.paused_on_request_id =
          e.request_id ?? e.external_ref ?? (e.details && e.details.request_id);
        open.suspend_reason = e.suspend_reason ?? (e.details && e.details.suspend_reason);
        open.paused_tool = e.tool ?? (e.details && e.details.tool);
      }
    } else if (isFail(k) || isDone(k)) {
      const status = isFail(k) ? "failed" : "completed";
      if (open) {
        open.status = status;
        open.duration_ms = durationMs(open.started_at, t);
        if (status === "failed") open.error = e.msg ?? e.message ?? e.error;
        runs.push(open);
        open = null;
      } else {
        runs.push({
          run_id: e.run_id ?? `${agentId}-run-${++n}`,
          agent_id: agentId,
          status,
          started_at: t,
          duration_ms: 0,
          error: status === "failed" ? e.msg ?? e.message ?? e.error : undefined,
        });
      }
    }
  }
  if (open) runs.push(open); // still-running run
  // Most recent first.
  return runs.reverse();
}

// Fetch recent runs for an agent. There is no `forgeos runs` verb in v0.1.0;
// run history is reconstructed from the activity log instead.
export async function fetchRecentRuns(agentId: string): Promise<RecentRunsResult> {
  const res = await runForgeos<unknown>(["logs", agentId, "--json"]);
  if (!res.ok) {
    const stderr = res.stderr || "";
    const unsupported = /unrecognized subcommand|unexpected argument|not found/i.test(stderr);
    return { runs: [], supported: !unsupported, error: stderr || `forgeos exited with code ${res.code}` };
  }
  const events = parseEvents(res.stdout);
  return { runs: foldRuns(agentId, events), supported: true };
}
