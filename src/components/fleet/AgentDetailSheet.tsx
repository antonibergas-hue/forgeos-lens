import { useState } from "react";
import { useForgeos } from "../../hooks/useForgeos";
import { AgentDetail, statusColor } from "../../lib/types";
import { AgentChat } from "../AgentChat";

type DetailTab = "overview" | "chat";

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "chat", label: "Chat" },
];

// Right-hand slide-over showing an agent's detail with tabs.
// Tabs: Overview (forgeos describe) + Chat (A2H session).
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
          {tab === "chat" && <AgentChat agentId={agentId} />}
        </div>
      </aside>
    </div>
  );
}

// ── Overview Panel (extracted for clarity) ────────────────────────────

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
