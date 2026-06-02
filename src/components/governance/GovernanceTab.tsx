import { useState } from "react";
import { useForgeos } from "../../hooks/useForgeos";
import { runForgeos } from "../../lib/forgeos";
import { SkeletonCard } from "../core/Skeleton";

interface Approval {
  id: string;
  title?: string;
  response_type?: string;
  source?: string;
  agent?: string;
  risk?: string;
}

// Governance tab: pending human-in-the-loop requests from `forgeos approvals
// list`, with approve / reject (approval type) and answer (text/choice) wired
// to `forgeos approvals approve|reject` and `forgeos answer` (TODO #8).
export function GovernanceTab() {
  const { data, error, isLoading, refetch } = useForgeos<Approval[]>({
    args: ["approvals", "list"],
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

  return (
    <div className="text-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="text-dim">
          <span className="text-bright font-semibold">{items.length}</span> pending request(s)
        </div>
        <button
          onClick={refetch}
          className="text-dim hover:text-text border border-border rounded px-2 py-0.5"
        >
          Refresh
        </button>
      </div>

      {error && <p className="text-danger mb-2">{error}</p>}

      {isLoading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} lines={3} />
          ))}
        </div>
      ) : (
        <>
          {!isLoading && items.length === 0 && (
            <p className="text-dim">No pending approvals.</p>
          )}

          <div className="space-y-2">
            {items.map((it) => {
              const isApproval = (it.response_type || "").toLowerCase() === "approval"
                || (it.response_type || "").toLowerCase() === "confirm";
              return (
                <div key={it.id} className="border border-border rounded p-2 bg-surface">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-warn">{it.risk || "medium"}</span>
                    <span className="text-dim">·</span>
                    <span className="text-dim">{it.agent?.slice(0, 12) || "agent"}</span>
                    <span className="text-dim">·</span>
                    <span className="text-dim">{it.response_type}</span>
                  </div>
                  <p className="text-text mb-2">{it.title}</p>
                  <div className="flex items-center gap-2">
                    {isApproval ? (
                      <>
                        <button
                          disabled={busy === it.id}
                          onClick={() => act(it.id, () => runForgeos(["approvals", "approve", it.id]))}
                          className="bg-ok/20 text-ok border border-ok/40 rounded px-2 py-0.5 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={busy === it.id}
                          onClick={() => act(it.id, () => runForgeos(["approvals", "reject", it.id]))}
                          className="bg-danger/20 text-danger border border-danger/40 rounded px-2 py-0.5 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          value={answers[it.id] ?? ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [it.id]: e.target.value }))}
                          placeholder="Your answer…"
                          className="flex-1 bg-bg text-text border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-info"
                        />
                        <button
                          disabled={busy === it.id}
                          onClick={() => act(it.id, () => runForgeos(["answer", it.id, "--text", answers[it.id] ?? ""]))}
                          className="bg-info/20 text-info border border-info/40 rounded px-2 py-0.5 disabled:opacity-50"
                        >
                          Answer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
