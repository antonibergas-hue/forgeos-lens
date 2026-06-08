// Shapes returned by the forgeos CLI JSON output.
export interface Agent {
  agent_id: string;
  name: string;
  stack: string;
  execution_type: string;
  status: string;
  department?: string;
  description?: string;
}

export interface AgentDetail {
  agent_id?: string;
  name: string;
  description?: string;
  stack?: string;
  execution_type?: string;
  schedule?: string | null;
  status?: string;
  department?: string;
  ownership?: string;
  llm_config?: { chat_model?: string; provider?: string };
  tools?: string[];
  metadata?: Record<string, unknown>;
  system_prompt?: string;
  created_at?: string;
}

export const statusColor = (s?: string): string => {
  switch ((s || "").toLowerCase()) {
    case "running":
      return "bg-info";
    case "completed":
    case "idle":
      return "bg-ok";
    case "failed":
      return "bg-danger";
    case "scheduled":
    case "paused":
      return "bg-warn";
    default:
      return "bg-dim";
  }
};

// ---- Log entry types (TODO #15) ----

export interface ToolCallDetail {
  cwd: string;
  cmd: string;
  returncode: number;
  stdout_tail?: string;
  stderr_tail?: string;
  pr_url?: string;
  files_changed?: string[];
}

export interface LogEntry {
  // Unique index in the store
  idx: number;
  // ISO-ish or human timestamp
  time: string;
  // kind: "started" | "completed" | "failed" | "tool" | other
  kind: string;
  // Human-readable summary line
  msg: string;
  // Present on kind==="tool" entries
  tool?: ToolCallDetail;
}

// ---- Agent run types ----

export interface AgentRun {
  run_id: string;
  agent_id: string;
  // "paused" = parked on a human-approval gate (runtime-v2 durable suspend).
  status: "completed" | "failed" | "running" | "cancelled" | "paused";
  started_at: string;
  duration_ms: number;
  phase?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  error?: string;
  // When paused: the approval request blocking this run + the gated tool.
  paused_on_request_id?: string;
  suspend_reason?: string;
  paused_tool?: string;
}

// ---- Approval / A2H types ----

export type ApprovalRequestType = "approval" | "confirm" | "text" | "choice" | "number";
export type ApprovalRisk = "low" | "medium" | "high";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "answered";

export interface Approval {
  id: string;
  agent_id: string;
  agent_name?: string;
  question: string;
  request_type: ApprovalRequestType;
  risk: ApprovalRisk;
  status: ApprovalStatus;
  created_at: string;
  // For "choice" type
  options?: string[];
  // Human reply (after answer)
  reply?: string;
  // Extra context surfaced by the real CLI (deadline/SLA approvals)
  category?: string;
  deadline?: string;
  // Runtime-v2: which durable run/continuation this approval is blocking, and
  // the gated tool. Empty for legacy approvals not tied to a run.
  run_id?: string;
  continuation_id?: string;
  tool?: string;
}

// The real `forgeos approvals list` emits a different JSON shape than the v2
// spec assumed (title/timestamp/agent/category vs question/created_at/
// agent_name/request_type). Normalize either shape into the UI Approval model
// so the queue renders against the installed CLI *and* the test fixtures.
export function normalizeApproval(raw: unknown): Approval {
  const r = (raw ?? {}) as Record<string, any>;
  const risk = (["low", "medium", "high"].includes(r.risk) ? r.risk : "low") as ApprovalRisk;
  const question =
    r.question ??
    [r.title, r.description].filter(Boolean).join(" — ") ??
    "(no description)";
  return {
    id: String(r.id ?? r.request_id ?? ""),
    agent_id: String(r.agent_id ?? r.agent ?? "unknown"),
    agent_name: r.agent_name ?? (r.agent && r.agent !== "unknown" ? r.agent : undefined),
    question: question || "(no description)",
    // Real CLI approvals are approve/reject style; only the fixture/aspirational
    // shape carries an explicit request_type + options.
    request_type: (r.request_type ?? "approval") as ApprovalRequestType,
    risk,
    status: (r.status ?? "pending") as ApprovalStatus,
    created_at: r.created_at ?? r.timestamp ?? "",
    options: Array.isArray(r.options) ? r.options : undefined,
    reply: r.reply,
    category: r.category,
    deadline: r.deadline,
    run_id: r.run_id ?? r.continuation_id ?? undefined,
    continuation_id: r.continuation_id ?? undefined,
    tool: r.tool ?? undefined,
  };
}

// ---- MCP server types ----

export type McpStatus = "connected" | "configured" | "error";

export interface McpTool {
  name: string;
  description: string;
  input_schema?: string;
}

export interface McpServer {
  name: string;
  url: string;
  status: McpStatus;
  protocol: "stdio" | "sse";
  latency_ms?: number;
  last_heartbeat?: string;
  tools: McpTool[];
  error?: string;
}

// ---- Cluster / Context-Health types ----

export type ConnectionState = "connected" | "disconnected" | "degraded" | "unknown";

export interface ContextHealth {
  name: string;
  version: string;
  connection: ConnectionState;
  latency_ms: number | null;
  last_error: string | null;
  checked_at: string;
}

// ---- Pod Shell types (TODO #16) ----
// Platform endpoint: POST /api/platform/agents/{agent_id}/shell
// Body: { cmd, cwd?, timeout? }  —  Response: { ok, stdout, stderr, code, cwd }

export interface PodShellRequest {
  cmd: string;
  cwd?: string;
  timeout?: number;
}

export interface PodShellResponse {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number;
  cwd: string;
}

// History line kept in the REPL pane
export interface ShellHistoryEntry {
  ts: string; // ISO timestamp
  cmd: string;
  cwd?: string;
  stdout: string;
  stderr: string;
  code: number;
}
