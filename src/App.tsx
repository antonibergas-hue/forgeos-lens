import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { runForgeos } from "./lib/forgeos";
import { ContextSwitcher } from "./components/core/ContextSwitcher";
import { FleetTab } from "./components/fleet/FleetTab";
import { LogsTab } from "./components/logs/LogsTab";
import { GovernanceTab } from "./components/governance/GovernanceTab";
import { McpTab } from "./components/mcp/McpTab";

// MC-style ForgeOS Lens shell: top bar (context name + status dot) + tab
// strip + content area. Real data wiring lands in subsequent TODOs (#3+).
// Spec source: dashboard/spec.md v2.

type TabKey =
  | "fleet"
  | "governance"
  | "logs"
  | "topology"
  | "mcp"
  | "manifest";

const TABS: { key: TabKey; label: string }[] = [
  { key: "fleet", label: "Fleet" },
  { key: "governance", label: "Governance" },
  { key: "logs", label: "Logs" },
  { key: "topology", label: "Topology" },
  { key: "mcp", label: "MCP" },
  { key: "manifest", label: "Manifest" },
];

export default function App() {
  const [tab, setTab] = useState<TabKey>("fleet");
  const [ok, setOk] = useState(false);
  // Placeholder; real read of ~/.forgeos/config.yaml comes in TODO #4.

  useEffect(() => {
    async function checkHealth() {
      const { ok, stderr } = await runForgeos(["health"]);
      setOk(ok);
      if (ok) {
        // Use a less intrusive toast for success, as per spec ("green dot").
        toast.message("ForgeOS CLI connected.", {
          icon: <div className="w-2 h-2 rounded-full bg-ok" />,
        });
      } else {
        // A more prominent error toast, as per spec ("red banner").
        toast.error("ForgeOS CLI health check failed.", {
          description: stderr || "Is `forgeos` installed and in your PATH?",
          duration: 10000, // Keep it sticky
        });
      }
    }
    checkHealth();
  }, []);

  return (
    <div className="h-full flex flex-col bg-bg text-text font-mono">
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          style: {
            background: "#161b22",
            borderColor: "#30363d",
          },
        }}
      />
      {/* Top bar — 24px */}
      <header className="h-6 px-3 flex items-center justify-between border-b border-border bg-surface text-xs">
        <div className="flex items-center gap-2">
          <span className="text-bright font-semibold">forgeos</span>
          <span className="text-dim">·</span>
          <ContextSwitcher onSwitch={() => window.location.reload()} />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              ok ? "bg-ok" : "bg-danger"
            }`}
            aria-label={ok ? "ok" : "error"}
          />
          <span className={ok ? "text-ok" : "text-danger"}>
            {ok ? "ok" : "error"}
          </span>
        </div>
      </header>

      {/* Tab strip — 32px */}
      <nav
        role="tablist"
        aria-label="Lens tabs"
        className="h-8 flex items-end border-b border-border bg-surface text-xs"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={[
                "px-3 h-full flex items-center",
                "border-b-2 -mb-px",
                active
                  ? "border-info text-bright"
                  : "border-transparent text-dim hover:text-text",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Content area */}
      <main className="flex-1 overflow-auto p-4">
        <TabContent tab={tab} />
      </main>
    </div>
  );
}

function TabContent({ tab }: { tab: TabKey }) {
  // Placeholder content — every tab is wired up in its own subsequent TODO.
  switch (tab) {
    case "fleet":
      return <FleetTab />;
    case "governance":
      return <GovernanceTab />;
    case "logs":
      return <LogsTab />;
    case "topology":
      return <Placeholder title="Topology" sub="A2A graph (TODO #9)." />;
    case "mcp":
      return <McpTab />;
    case "manifest":
      return <Placeholder title="Manifest" sub="YAML editor + Reapply (TODO #11)." />;
  }
}

function Placeholder({ title, sub }: { title: string; sub: string }) {
  return (
    <section className="max-w-xl">
      <h1 className="text-bright text-base mb-1">{title}</h1>
      <p className="text-dim">{sub}</p>
    </section>
  );
}
