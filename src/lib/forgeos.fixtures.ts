// Browser-only fixtures used when the page runs without the Tauri runtime
// (Playwright drives http://localhost:5173 directly, so window.__TAURI_INTERNALS__
// is undefined and runForgeos / startLogStream route here instead of the
// shell plugin). The fixture set is intentionally small but enough to drive
// every tab through its happy path and exercise the merge-gate assertions
// in tests/smoke.spec.ts. Lazy-imported from forgeos.ts so production Tauri
// builds never download this chunk.

import type { ForgeosResult } from "./forgeos";

const AGENTS = [
  {
    agent_id: "381ad7c1-2e5",
    name: "forgeos-lens-orchestrator",
    stack: "forgeos",
    execution_type: "reflex",
    status: "completed",
    department: "operations",
    description: "Top-level orchestrator for forgeos-lens.",
  },
  {
    agent_id: "4d45fb8f-baa",
    name: "forgeos-lens-builder",
    stack: "forgeos",
    execution_type: "reflex",
    status: "completed",
    department: "engineering",
    description: "Scaffolds features via qwen-code + gh.",
  },
  {
    agent_id: "53856256-253",
    name: "forgeos-lens-tester",
    stack: "forgeos",
    execution_type: "reflex",
    status: "idle",
    department: "engineering",
    description: "Runs pnpm/cargo/playwright; returns JSON.",
  },
  {
    agent_id: "c62a1e37-542",
    name: "forgeos-lens-pr-reviewer",
    stack: "forgeos",
    execution_type: "scheduled",
    status: "scheduled",
    department: "engineering",
    description: "Reviews PRs every 5 min via gh.",
  },
  {
    agent_id: "fixture-a01",
    name: "fixture-fleet-alpha",
    stack: "forgeos",
    execution_type: "reflex",
    status: "running",
    department: "operations",
  },
  {
    agent_id: "fixture-a02",
    name: "fixture-fleet-bravo",
    stack: "forgeos",
    execution_type: "reflex",
    status: "idle",
    department: "operations",
  },
  {
    agent_id: "fixture-a03",
    name: "fixture-fleet-charlie",
    stack: "forgeos",
    execution_type: "scheduled",
    status: "failed",
    department: "operations",
  },
];

const CONTEXTS_TABLE = [
  "CUR     NAME            AUTH         SERVER",
  "------  --------------  -----------  ----------------------------------------",
  "*       cloud-run       bearer       https://forgeos-fixtures.example.run.app",
  "        prod            bearer       https://forgeos-fixtures.example.run.app",
].join("\n");

const APPROVALS = [
  {
    id: "req_fixture_001",
    agent: "fixture-fleet-alpha",
    response_type: "text",
    risk: "medium",
    source: "a2h",
    description: { prompt: "Approve merge of feat/lens-pipeline-hardening?" },
  },
];

function ok<T>(stdout: string, parsed?: T): ForgeosResult<T> {
  return { ok: true, stdout, stderr: "", code: 0, parsed };
}
function fail<T>(stderr: string, code = 1): ForgeosResult<T> {
  return { ok: false, stdout: "", stderr, code };
}

export async function fixtureRunForgeos<T>(args: string[]): Promise<ForgeosResult<T>> {
  // Small artificial latency so smoke tests can assert non-instantaneous
  // population (useful when checking that data doesn't oscillate to empty
  // during a refetch — bug #6 in the pipeline-hardening plan).
  await new Promise((r) => setTimeout(r, 30));

  const [head, ...rest] = args;
  if (head === "health") return ok("ok");
  if (head === "list" && rest.includes("--json")) {
    return ok(JSON.stringify(AGENTS), AGENTS as unknown as T);
  }
  if (head === "describe" && rest.includes("--json")) {
    const id = rest.find((a) => !a.startsWith("--")) || "";
    const a = AGENTS.find((x) => x.agent_id === id);
    if (!a) return fail(`agent ${id} not found`, 1);
    const detail = {
      ...a,
      schedule: null,
      llm_config: { chat_model: "qwen3.6-27b", provider: "vllm" },
      tools: ["shell__exec", "memory__read", "memory__write"],
      metadata: { fixture: true },
      created_at: "2026-05-27T11:49:40Z",
    };
    return ok(JSON.stringify(detail), detail as unknown as T);
  }
  if (head === "config" && rest[0] === "get-contexts") {
    return ok(CONTEXTS_TABLE);
  }
  if (head === "config" && rest[0] === "use-context") {
    return ok("");
  }
  if (head === "approvals" && rest[0] === "list") {
    return ok(JSON.stringify(APPROVALS), APPROVALS as unknown as T);
  }
  if (head === "approvals" && (rest[0] === "approve" || rest[0] === "reject")) {
    return ok("");
  }
  if (head === "answer") return ok("");

  return fail(`fixture: unhandled '${args.join(" ")}'`, 2);
}

// Stream a short, deterministic log so the Logs tab has something to render
// in a smoke run. Returns immediately; emits lines via setTimeout.
export function fixtureStartLogStream(
  _agentId: string,
  onLine: (line: string) => void,
): { kill: () => Promise<void> } {
  let killed = false;
  const lines = [
    "[fixture] run.started agent=fixture-fleet-alpha",
    "[fixture] tool.call name=shell__exec cmd=ls",
    "[fixture] tool.result ok=true rc=0",
    "[fixture] run.finished",
  ];
  lines.forEach((l, i) => {
    setTimeout(() => {
      if (!killed) onLine(l);
    }, 50 + i * 80);
  });
  return {
    kill: async () => {
      killed = true;
    },
  };
}
