import { useState, useEffect } from "react";
import { useForgeos } from "../../hooks/useForgeos";
import { AgentDetail, AgentRun, statusColor } from "../../lib/types";
import { fetchRecentRuns } from "../../lib/runs";
import { AgentChat } from "../AgentChat";
import { PodShell } from "./PodShell";

type DetailTab = "overview" | "runs" | "chat" | "shell";

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "runs", label: "Recent runs" },
  { key: "chat", label: "Chat" },
  { key: "shell", label: "Shell" },
];

// Right-hand slide-over showing an agent's detail with tabs.
// Tabs: Overview (forgeos describe) + Recent runs + Chat (A2H session) + Shell (Pod-shell).
export function AgentDetailSheet({
  agentId,
  onClose,
}: {
  agentId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const { data, error, isLoading } = useForgeos<AgentDetail>({
    args: ["describe", agentId, "--json"],
  });

  const lastRun =
    (data?.metadata?.["last_run"] as string | undefined) ||
    data?.created_at ||
    "—";

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="relative z-50 w-[420px] max-w-[90vw] h-full bg-surface border-l border-border flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <h2 className="text-bright text-sm font-semibold truncate pr-2">
            {data?.name || agentId}
          </h2>
          <button
            onClick={onClose}
            className="text-dim hover:text-text px-2 shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab strip */}
        <div className="flex items-end border-b border-border px-2 shrink-0" role="tablist">
          {DETAIL_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={[
                  "px-2 py-1 border-b-2 -mb-px text-xs",
                  active ? "border-info text-bright" : "border-transparent text-dim hover:text-text",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-4">
          {tab === "overview" && (
            <OverviewPanel
              agentId={agentId}
              data={data}
              error={error}
              isLoading={isLoading}
              lastRun={lastRun}
            />
          )}
          {tab === "runs" && <RunsPanel agentId={agentId} />}
          {tab === "chat" && <AgentChat agentId={agentId} />}
          {tab === "shell" && <PodShell agentId={agentId} />}
        </div>
      </aside>
    </div>
  );
}

// ── Overview Panel ───────────────────────────────────────────────────

function OverviewPanel({
  agentId,
  data,
  error,
  isLoading,
  lastRun,
}: {
  agentId: string;
  data: AgentDetail | null;
  error: string | null;
  isLoading: boolean;
  lastRun: string;
}) {
  if (isLoading) return <p className="text-dim">Loading…</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-dim">No data.</p>;

  return (
    <div>
      {data.description && <p className="text-dim mb-3">{data.description}</p>}
      <dl className="space-y-2">
        <Row label="ID" value={agentId} />
        <Row
          label="Status"
          value={
            <span className="inline-flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${statusColor(data.status)}`} />
              {data.status || "—"}
            </span>
          }
        />
        <Row label="Type" value={data.execution_type || "—"} />
        <Row label="Schedule" value={data.schedule || "—"} />
        <Row
          label="Model"
          value={
            data.llm_config?.chat_model
              ? `${data.llm_config.chat_model} (${data.llm_config.provider || "?"})`
              : "—"
          }
        />
        <Row label="Tools" value={String(data.tools?.length ?? 0)} />
        <Row label="Department" value={data.department || "—"} />
        <Row label="Ownership" value={data.ownership || "—"} />
        <Row label="Last run" value={lastRun} />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="text-dim w-24 shrink-0">{label}</dt>
      <dd className="text-text break-all">{value}</dd>
    </div>
  );
}

// ── Runs Panel ───────────────────────────────────────────────────────

function RunsPanel({ agentId }: { agentId: string }) {
  // forgeos v0.1.0 has no `runs` verb — reconstruct run history from the
  // activity log (`forgeos logs <id> --json`, run start/end events).
  const [data, setData] = useState<AgentRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setIsLoading(true);
    fetchRecentRuns(agentId)
      .then((r) => {
        if (!alive) return;
        setData(r.runs);
        setSupported(r.supported);
        setError(r.supported ? null : r.error ?? null);
      })
      .catch((e) => alive && setError(e.message ?? "Failed to load runs"))
      .finally(() => alive && setIsLoading(false));
    return () => {
      alive = false;
    };
  }, [agentId]);

  if (isLoading) return <p className="text-dim">Loading runs…</p>;
  if (!supported)
    return (
      <p className="text-dim">
        Run history isn't available in this <code>forgeos</code> version (no run-log backing).
      </p>
    );
  if (error) return <p className="text-danger">{error}</p>;
  if (!data || data.length === 0) return <p className="text-dim">No recent runs recorded.</p>;

  return (
    <div className="space-y-3">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-dim border-b border-border">
            <th className="pb-1 font-normal">STARTED</th>
            <th className="pb-1 font-normal">STATUS</th>
            <th className="pb-1 font-normal text-right">DUR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.map((r) => (
            <tr key={r.run_id} className="group hover:bg-surface-light">
              <td className="py-2 text-dim">
                {Number.isNaN(new Date(r.started_at).getTime())
                  ? r.started_at || "—"
                  : new Date(r.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusColor(r.status)}`} />
                  <span className={r.status === 'failed' ? 'text-danger' : r.status === 'paused' ? 'text-warn' : 'text-text'}>
                    {r.status === 'paused' ? '⏸ awaiting approval' : r.status}
                  </span>
                </div>
                {r.status === 'paused' && (r.paused_tool || r.paused_on_request_id) && (
                  <div className="text-[10px] text-dim truncate max-w-[180px]">
                    {r.paused_tool ? `tool ${r.paused_tool}` : ''}
                    {r.paused_on_request_id ? ` · ${r.paused_on_request_id}` : ''}
                  </div>
                )}
                {r.error && (
                  <div className="text-[10px] text-danger/80 truncate max-w-[180px]" title={r.error}>
                    {r.error}
                  </div>
                )}
              </td>
              <td className="py-2 text-right text-dim">
                {Math.round(r.duration_ms / 1000)}s
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pt-2 border-t border-border/40">
        <div className="flex justify-between text-[10px] text-dim">
          <span>{data.length} runs loaded</span>
          <span>derived from forgeos logs {agentId.slice(0, 8)} --json</span>
        </div>
      </div>
    </div>
  );
}
