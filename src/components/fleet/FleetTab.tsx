import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useForgeos } from "../../hooks/useForgeos";
import { Agent, statusColor } from "../../lib/types";
import { AgentDetailSheet } from "./AgentDetailSheet";
import { SkeletonRow } from "../core/Skeleton";

// Fleet tab: a bar (count + refresh) over a table of deployed agents from
// `forgeos list --json`. Clicking a row opens the detail sheet (TODO #5/#6).
export function FleetTab() {
  const { data, error, isLoading, refetch } = useForgeos<Agent[]>({
    args: ["list", "--json"],
  });
  const [selected, setSelected] = useState<string | null>(null);

  const agents = data ?? [];

  return (
    <div className="text-xs">
      {/* FleetBar */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-dim">
          <span className="text-bright font-semibold">{agents.length}</span> agents
        </div>
        <button
          onClick={refetch}
          className="inline-flex items-center gap-1 text-dim hover:text-text border border-border rounded px-2 py-0.5"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && <p className="text-danger mb-2">{error}</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-dim text-left border-b border-border">
            <th className="py-1 pr-3 font-normal">ID</th>
            <th className="py-1 pr-3 font-normal">NAME</th>
            <th className="py-1 pr-3 font-normal">STACK</th>
            <th className="py-1 pr-3 font-normal">TYPE</th>
            <th className="py-1 pr-3 font-normal">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {isLoading && !data ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonRow key={i} columns={5} />
              ))}
            </>
          ) : (
            agents.map((a) => (
              <tr
                key={a.agent_id}
                onClick={() => setSelected(a.agent_id)}
                className="border-b border-border/50 hover:bg-border/30 cursor-pointer"
              >
                <td className="py-1 pr-3 text-dim">{a.agent_id.slice(0, 12)}</td>
                <td className="py-1 pr-3 text-text">{a.name}</td>
                <td className="py-1 pr-3 text-dim">{a.stack}</td>
                <td className="py-1 pr-3 text-dim">{a.execution_type}</td>
                <td className="py-1 pr-3">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-block w-2 h-2 rounded-full ${statusColor(a.status)}`} />
                    <span className="text-dim">{a.status}</span>
                  </span>
                </td>
              </tr>
            ))
          )}
          {!isLoading && agents.length === 0 && !data && (
            <tr>
              <td colSpan={5} className="py-3 text-dim text-center">
                No agents deployed.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selected && (
        <AgentDetailSheet agentId={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
