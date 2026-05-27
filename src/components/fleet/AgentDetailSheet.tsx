import { useForgeos } from "../../hooks/useForgeos";
import { AgentDetail, statusColor } from "../../lib/types";

// Right-hand slide-over showing an agent's manifest overview, backed by
// `forgeos describe <id> --json` (TODO #6).
export function AgentDetailSheet({
  agentId,
  onClose,
}: {
  agentId: string;
  onClose: () => void;
}) {
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
      <aside className="relative z-50 w-[420px] max-w-[90vw] h-full bg-surface border-l border-border overflow-auto p-4 text-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-bright text-sm font-semibold truncate">
            {data?.name || agentId}
          </h2>
          <button
            onClick={onClose}
            className="text-dim hover:text-text px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {isLoading && <p className="text-dim">Loading…</p>}
        {error && <p className="text-danger">{error}</p>}

        {data && (
          <dl className="space-y-2">
            {data.description && (
              <p className="text-dim mb-3">{data.description}</p>
            )}
            <Row label="ID" value={agentId} />
            <Row label="Status" value={
              <span className="inline-flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${statusColor(data.status)}`} />
                {data.status || "—"}
              </span>
            } />
            <Row label="Type" value={data.execution_type || "—"} />
            <Row label="Schedule" value={data.schedule || "—"} />
            <Row label="Model" value={
              data.llm_config?.chat_model
                ? `${data.llm_config.chat_model} (${data.llm_config.provider || "?"})`
                : "—"
            } />
            <Row label="Tools" value={String(data.tools?.length ?? 0)} />
            <Row label="Department" value={data.department || "—"} />
            <Row label="Ownership" value={data.ownership || "—"} />
            <Row label="Last run" value={lastRun} />
          </dl>
        )}
      </aside>
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
