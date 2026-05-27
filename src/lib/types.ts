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
