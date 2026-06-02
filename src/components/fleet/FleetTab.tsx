import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Search, ChevronUp, ChevronDown } from "lucide-react";
import { useForgeos } from "../../hooks/useForgeos";
import { Agent, statusColor } from "../../lib/types";
import { FleetBar } from "../core/FleetBar";
import { SkeletonRow } from "../core/Skeleton";

type SortField = "agent_id" | "name" | "stack" | "execution_type" | "status";
type SortOrder = "asc" | "desc";

// Fleet tab: a FleetBar strip (phase-count pills) over a table of deployed
// agents from `forgeos list --json`.
// Features: Column sorting, text filtering, j/k keyboard navigation, auto-polling.
export function FleetTab({ onSelectAgent }: { onSelectAgent: (id: string) => void }) {
  const { data, error, isLoading, refetch } = useForgeos<Agent[]>({
    args: ["list", "--json"],
  });

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Auto-refresh every 10s (spec: "real-data polish")
  useEffect(() => {
    const timer = setInterval(() => refetch(), 10000);
    return () => clearInterval(timer);
  }, [refetch]);

  const agents = data ?? [];

  // Filter & Sort
  const filteredAgents = useMemo(() => {
    let result = [...agents];

    // Filter
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.agent_id.toLowerCase().includes(s) ||
          a.name.toLowerCase().includes(s) ||
          a.stack.toLowerCase().includes(s) ||
          a.execution_type.toLowerCase().includes(s) ||
          a.status.toLowerCase().includes(s)
      );
    }

    // Sort
    result.sort((a, b) => {
      const valA = String(a[sortField] || "").toLowerCase();
      const valB = String(b[sortField] || "").toLowerCase();
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [agents, search, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Keyboard navigation (j/k, enter, /)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement?.tagName === "INPUT") {
        if (e.key === "Escape") {
          (document.activeElement as HTMLInputElement).blur();
        }
        return;
      }

      if (e.key === "j") {
        setFocusedIndex((i) => Math.min(i + 1, filteredAgents.length - 1));
      } else if (e.key === "k") {
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const target = filteredAgents[focusedIndex];
        if (target) onSelectAgent(target.agent_id);
      } else if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("#fleet-search")?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredAgents, focusedIndex, onSelectAgent]);

  // Keep focus in bounds if list changes
  useEffect(() => {
    if (focusedIndex >= filteredAgents.length && filteredAgents.length > 0) {
      setFocusedIndex(filteredAgents.length - 1);
    }
  }, [filteredAgents.length, focusedIndex]);

  return (
    <div className="text-xs h-full flex flex-col font-mono">
      {/* FleetBar strip */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <FleetBar agents={agents} />
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-dim group-focus-within:text-info" />
            <input
              id="fleet-search"
              type="text"
              placeholder="Search agents... (/)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface border border-border rounded px-2 py-1 pl-7 w-48 focus:outline-none focus:border-info transition-colors text-[11px]"
            />
          </div>
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1 text-dim hover:text-text border border-border rounded px-2 py-1 shrink-0 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-border rounded bg-bg">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-surface z-10 shadow-sm">
            <tr className="text-dim text-left border-b border-border select-none">
              <Header label="ID" field="agent_id" active={sortField} order={sortOrder} onToggle={toggleSort} />
              <Header label="NAME" field="name" active={sortField} order={sortOrder} onToggle={toggleSort} />
              <Header label="STACK" field="stack" active={sortField} order={sortOrder} onToggle={toggleSort} />
              <Header label="TYPE" field="execution_type" active={sortField} order={sortOrder} onToggle={toggleSort} />
              <Header label="STATUS" field="status" active={sortField} order={sortOrder} onToggle={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {isLoading && agents.length === 0 ? (
              <>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SkeletonRow key={i} columns={5} />
                ))}
              </>
            ) : filteredAgents.length > 0 ? (
              filteredAgents.map((a, i) => {
                const isFocused = focusedIndex === i;
                return (
                  <tr
                    key={a.agent_id}
                    onClick={() => onSelectAgent(a.agent_id)}
                    className={`
                      border-b border-border/30 cursor-pointer transition-colors
                      ${isFocused ? "bg-surface/60 ring-1 ring-inset ring-info/50 shadow-inner" : "hover:bg-surface/30"}
                    `}
                  >
                    <td className="py-1 px-3 text-dim font-mono">{a.agent_id.slice(0, 12)}</td>
                    <td className="py-1 px-3 text-bright font-medium">{a.name}</td>
                    <td className="py-1 px-3 text-dim">{a.stack}</td>
                    <td className="py-1 px-3 text-dim uppercase tracking-tighter text-[10px]">{a.execution_type}</td>
                    <td className="py-1 px-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${statusColor(a.status)}`} />
                        <span className="text-text">{a.status}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-dim text-center italic">
                  {search ? `No agents matching "${search}"` : "No agents deployed."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Keyboard hints footer */}
      <div className="mt-2 text-[10px] text-dim flex gap-4 px-1 shrink-0">
        <span><b className="text-text">j/k</b> move focus</span>
        <span><b className="text-text">Enter</b> details</span>
        <span><b className="text-text">/</b> search</span>
        {error && <span className="text-danger ml-auto">Error: {error}</span>}
      </div>
    </div>
  );
}

function Header({
  label,
  field,
  active,
  order,
  onToggle,
}: {
  label: string;
  field: SortField;
  active: SortField;
  order: SortOrder;
  onToggle: (f: SortField) => void;
}) {
  const isActive = active === field;
  return (
    <th
      onClick={() => onToggle(field)}
      className="py-2 px-3 font-normal cursor-pointer hover:bg-border/20 transition-colors group"
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${isActive ? "opacity-100 text-info" : "opacity-0 group-hover:opacity-40"}`}>
          {isActive && order === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </span>
      </div>
    </th>
  );
}
