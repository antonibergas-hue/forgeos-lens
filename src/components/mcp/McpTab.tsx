import { useState, useMemo } from "react";
import { RefreshCw, Search, ChevronRight, ChevronDown, Activity, Globe, Wrench, AlertCircle } from "lucide-react";
import { useForgeos } from "../../hooks/useForgeos";
import { McpServer, McpTool } from "../../lib/types";
import { SkeletonRow } from "../core/Skeleton";

// MCP tab: lists the Model Context Protocol servers configured on the platform.
// Features: Expandable server rows showing tools, connection status details,
// search/filter, and refresh.
export function McpTab() {
  const { data, error, isLoading, refetch } = useForgeos<McpServer[]>({
    args: ["mcp", "list", "--json"],
  });

  const [search, setSearch] = useState("");
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  const servers = data ?? [];

  const toggleExpand = (name: string) => {
    const next = new Set(expandedServers);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setExpandedServers(next);
  };

  const filteredServers = useMemo(() => {
    if (!search) return servers;
    const s = search.toLowerCase();
    return servers.filter(
      (srv) =>
        srv.name.toLowerCase().includes(s) ||
        srv.url.toLowerCase().includes(s) ||
        srv.tools.some((t) => t.name.toLowerCase().includes(s) || t.description.toLowerCase().includes(s))
    );
  }, [servers, search]);

  return (
    <div className="text-xs h-full flex flex-col font-mono">
      {/* Header controls */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex flex-col">
          <h2 className="text-bright font-semibold">MCP Servers</h2>
          <p className="text-dim text-[10px]">Model Context Protocol integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-dim group-focus-within:text-info" />
            <input
              type="text"
              placeholder="Search servers or tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface border border-border rounded px-2 py-1 pl-7 w-64 focus:outline-none focus:border-info transition-colors text-[11px]"
            />
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 text-dim hover:text-text border border-border rounded px-2 py-1 shrink-0 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto border border-border rounded bg-bg">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 bg-surface z-10 shadow-sm">
            <tr className="text-dim text-left border-b border-border select-none">
              <th className="py-2 px-3 font-normal w-8"></th>
              <th className="py-2 px-3 font-normal">SERVER</th>
              <th className="py-2 px-3 font-normal">PROTOCOL</th>
              <th className="py-2 px-3 font-normal text-right">TOOLS</th>
              <th className="py-2 px-3 font-normal">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && servers.length === 0 ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonRow key={i} columns={5} />
                ))}
              </>
            ) : filteredServers.length > 0 ? (
              filteredServers.map((srv) => (
                <ServerRow
                  key={srv.name}
                  server={srv}
                  isExpanded={expandedServers.has(srv.name)}
                  onToggle={() => toggleExpand(srv.name)}
                  searchQuery={search}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-dim text-center italic">
                  {search ? `No servers matching "${search}"` : "No MCP servers configured."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="mt-2 p-2 border border-danger/30 bg-danger/5 text-danger rounded flex items-start gap-2 animate-in fade-in slide-in-from-bottom-1">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            Error loading MCP servers: {error}
          </div>
        </div>
      )}
    </div>
  );
}

function ServerRow({
  server,
  isExpanded,
  onToggle,
  searchQuery,
}: {
  server: McpServer;
  isExpanded: boolean;
  onToggle: () => void;
  searchQuery: string;
}) {
  const statusColor = (s: string) => {
    switch (s) {
      case "connected":
        return "bg-ok";
      case "configured":
        return "bg-dim";
      case "error":
        return "bg-danger";
      default:
        return "bg-dim";
    }
  };

  return (
    <>
      <tr
        onClick={onToggle}
        className={`
          border-b border-border/30 cursor-pointer transition-colors group
          ${isExpanded ? "bg-surface/40" : "hover:bg-surface/20"}
        `}
      >
        <td className="py-2 px-3 text-dim">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </td>
        <td className="py-2 px-3">
          <div className="flex flex-col">
            <span className="text-bright font-medium">{server.name}</span>
            <span className="text-[10px] text-dim flex items-center gap-1">
              <Globe className="w-3 h-3" /> {server.url}
            </span>
          </div>
        </td>
        <td className="py-2 px-3 text-dim uppercase tracking-tighter text-[10px]">
          {server.protocol}
        </td>
        <td className="py-2 px-3 text-right">
          <span className="text-dim text-[11px] bg-border/30 px-1.5 py-0.5 rounded">
            {server.tools.length} tools
          </span>
        </td>
        <td className="py-2 px-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${statusColor(server.status)}`} />
              <span className={server.status === "error" ? "text-danger" : "text-text"}>
                {server.status}
              </span>
            </div>
            {server.latency_ms && (
              <div className="text-[9px] text-dim flex items-center gap-1">
                <Activity className="w-3 h-3" /> {server.latency_ms}ms
              </div>
            )}
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-surface/20 p-0 overflow-hidden">
            <div className="border-b border-border/30 animate-in slide-in-from-top-1 duration-200">
              <div className="p-4 pl-12 space-y-3">
                {server.error && (
                  <div className="text-danger flex items-start gap-2 mb-2 p-2 bg-danger/5 border border-danger/20 rounded">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="text-[11px]">{server.error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {server.tools.length > 0 ? (
                    server.tools
                      .filter(
                        (t) =>
                          !searchQuery ||
                          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((tool) => (
                        <ToolCard key={tool.name} tool={tool} />
                      ))
                  ) : (
                    <div className="col-span-2 text-dim italic text-[11px]">No tools exposed by this server.</div>
                  )}
                </div>

                {server.last_heartbeat && (
                  <div className="text-[9px] text-dim pt-2 border-t border-border/30">
                    Last heartbeat: {new Date(server.last_heartbeat).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ToolCard({ tool }: { tool: McpTool }) {
  return (
    <div className="border border-border/50 rounded p-2 bg-bg/50 hover:border-info/30 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1 bg-info/10 rounded">
          <Wrench className="w-3 h-3 text-info" />
        </div>
        <span className="text-bright text-[11px] font-semibold">{tool.name}</span>
      </div>
      <p className="text-dim text-[10px] leading-relaxed">
        {tool.description}
      </p>
    </div>
  );
}
