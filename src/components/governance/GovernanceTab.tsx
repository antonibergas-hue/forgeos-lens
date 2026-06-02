import { useState } from "react";
import { useForgeos } from "../../hooks/useForgeos";
import { runForgeos } from "../../lib/forgeos";
import { Approval } from "../../lib/types";
import { SkeletonCard } from "../core/Skeleton";
import { Check, X, Send, Clock, ShieldAlert } from "lucide-react";

// Governance tab: pending human-in-the-loop requests from `forgeos approvals
// list --json`, with a structured queue view for approve/deny and questions.
export function GovernanceTab() {
  const { data, error, isLoading, refetch } = useForgeos<Approval[]>({
    args: ["approvals", "list", "--json"],
  });
  const items = data ?? [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function act(id: string, run: () => Promise<unknown>) {
    setBusy(id);
    await run();
    setBusy(null);
    refetch();
  }

  const formatAge = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

  const riskColor = (risk: string) => {
    switch (risk) {
      case "high": return "text-danger";
      case "medium": return "text-warn";
      case "low": return "text-ok";
      default: return "text-dim";
    }
  };

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-bright font-semibold uppercase tracking-wider">Approvals Queue</h2>
          <span className="text-dim text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded">
            {items.length} PENDING
          </span>
        </div>
        <button
          onClick={refetch}
          className="text-dim hover:text-text border border-border rounded px-2 py-0.5 flex items-center gap-1.5 transition-colors"
        >
          <Clock size={12} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded mb-4">
          {error}
        </div>
      )}

      {isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-12 text-center">
              <p className="text-dim">No pending approval requests.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((it) => {
                const isBool = it.request_type === "approval" || it.request_type === "confirm";
                const isChoice = it.request_type === "choice";
                
                return (
                  <div key={it.id} className="border border-border rounded-md bg-surface overflow-hidden">
                    <div className="bg-bg/40 px-3 py-2 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`font-bold flex items-center gap-1 ${riskColor(it.risk)}`}>
                          <ShieldAlert size={12} />
                          {it.risk.toUpperCase()}
                        </span>
                        <span className="text-dim">·</span>
                        <span className="text-bright">{it.agent_name || it.agent_id}</span>
                        <span className="text-dim">·</span>
                        <span className="text-dim uppercase text-[10px]">{it.request_type}</span>
                      </div>
                      <span className="text-dim flex items-center gap-1">
                        <Clock size={10} />
                        {formatAge(it.created_at)}
                      </span>
                    </div>

                    <div className="p-3">
                      <p className="text-text text-sm mb-4 leading-relaxed">{it.question}</p>
                      
                      <div className="flex items-center gap-2">
                        {isBool ? (
                          <>
                            <button
                              disabled={busy === it.id}
                              onClick={() => act(it.id, () => runForgeos(["approvals", "approve", it.id]))}
                              className="bg-ok/10 text-ok border border-ok/30 hover:bg-ok/20 rounded px-3 py-1 flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                              <Check size={14} />
                              Approve
                            </button>
                            <button
                              disabled={busy === it.id}
                              onClick={() => act(it.id, () => runForgeos(["approvals", "reject", it.id]))}
                              className="bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 rounded px-3 py-1 flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                              <X size={14} />
                              Reject
                            </button>
                          </>
                        ) : isChoice && it.options ? (
                          <div className="flex flex-wrap gap-2">
                            {it.options.map((opt) => (
                              <button
                                key={opt}
                                disabled={busy === it.id}
                                onClick={() => act(it.id, () => runForgeos(["answer", it.id, "--text", opt]))}
                                className="bg-info/10 text-info border border-info/30 hover:bg-info/20 rounded px-3 py-1 transition-all disabled:opacity-50"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              value={answers[it.id] ?? ""}
                              onChange={(e) => setAnswers((a) => ({ ...a, [it.id]: e.target.value }))}
                              placeholder="Type your response..."
                              className="flex-1 bg-bg text-text border border-border rounded px-3 py-1 focus:outline-none focus:border-info text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && answers[it.id]) {
                                  act(it.id, () => runForgeos(["answer", it.id, "--text", answers[it.id]]));
                                }
                              }}
                            />
                            <button
                              disabled={busy === it.id || !answers[it.id]}
                              onClick={() => act(it.id, () => runForgeos(["answer", it.id, "--text", answers[it.id]]))}
                              className="bg-info/10 text-info border border-info/30 hover:bg-info/20 rounded px-3 py-1 flex items-center gap-1.5 transition-all disabled:opacity-50"
                            >
                              <Send size={14} />
                              Answer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
