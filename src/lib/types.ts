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
  status: "completed" | "failed" | "running" | "cancelled";
  started_at: string;
  duration_ms: number;
  phase?: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  error?: string;
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
