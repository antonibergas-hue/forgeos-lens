import { SkeletonRow } from "../core/Skeleton";

// MCP tab: a static list of the MCP servers the platform is configured with.
// MCP servers are managed server-side; this is an informational view (TODO #10).
const MCP_SERVERS = [
  { name: "google-workspace", desc: "Gmail / Drive / Calendar", status: "configured" },
  { name: "atlassian", desc: "Jira / Confluence", status: "connected" },
  { name: "slack", desc: "Messaging", status: "configured" },
  { name: "postgres", desc: "Database", status: "configured" },
  { name: "stripe", desc: "Payments", status: "configured" },
];

export function McpTab() {
  const isLoading = false; // MCP is currently static

  return (
    <div className="text-xs">
      <p className="text-dim mb-3">
        MCP servers are configured on the platform. This is a static reference list.
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-dim text-left border-b border-border">
            <th className="py-1 pr-3 font-normal">SERVER</th>
            <th className="py-1 pr-3 font-normal">DESCRIPTION</th>
            <th className="py-1 pr-3 font-normal">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columns={3} />
              ))}
            </>
          ) : (
            MCP_SERVERS.map((s) => (
              <tr key={s.name} className="border-b border-border/50">
                <td className="py-1 pr-3 text-text">{s.name}</td>
                <td className="py-1 pr-3 text-dim">{s.desc}</td>
                <td className="py-1 pr-3">
                  <span className="inline-flex items-center gap-1.5 text-dim">
                    <span className={`inline-block w-2 h-2 rounded-full ${s.status === "connected" ? "bg-ok" : "bg-dim"}`} />
                    {s.status}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
