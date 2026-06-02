import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { runForgeos } from "./lib/forgeos";
import { ContextSwitcher } from "./components/core/ContextSwitcher";
import { FleetTab } from "./components/fleet/FleetTab";
import { LogsTab } from "./components/logs/LogsTab";
import { GovernanceTab } from "./components/governance/GovernanceTab";
import { McpTab } from "./components/mcp/McpTab";
import { TopologyTab } from "./components/topology/TopologyTab";
import { ManifestTab } from "./components/manifest/ManifestTab";
import { CommandPalette } from "./components/core/CommandPalette";
import { TabErrorBoundary } from "./components/core/TabErrorBoundary";
import { StatusBar } from "./components/core/StatusBar";
import { AgentDetailSheet } from "./components/fleet/AgentDetailSheet";
import { KeyboardShortcutsOverlay } from "./components/core/KeyboardShortcutsOverlay";

// MC-style ForgeOS Lens shell: top bar (context + status) + tab strip +
// content. All data flows through shell-outs to the forgeos CLI.

export type TabKey =
  | "fleet"
  | "governance"
  | "logs"
  | "topology"
  | "mcp"
  | "manifest";

export const TABS: { key: TabKey; label: string }[] = [
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
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  useEffect(() => {
    async function checkHealth() {
      const { ok, stderr } = await runForgeos(["health"]);
      setOk(ok);
      if (ok) {
        toast.message("ForgeOS CLI connected.", {
          icon: <div className="w-2 h-2 rounded-full bg-ok" />,
        });
      } else {
        toast.error("ForgeOS CLI health check failed.", {
          description: stderr || "Is `forgeos` installed and in your PATH?",
          duration: 10000,
        });
      }
    }
    checkHealth();
  }, []);

  // Keyboard shortcuts:
  // - cmd/ctrl+k: command palette
  // - cmd/ctrl+1..6: switch tabs
  // - ?: shortcuts overlay
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }

      if (mod && /^[1-6]$/.test(e.key)) {
        e.preventDefault();
        setTab(TABS[Number(e.key) - 1].key);
        return;
      }

      // '?' key (often Shift+/)
      if (e.key === "?" && !mod && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        setShortcutsOpen((v) => !v);
      }

      if (e.key === "Escape") {
        setPaletteOpen(false);
        setShortcutsOpen(false);
        // setSelectedAgentId(null) — handled by the sheet's own Esc if it wants, but global Esc is safe
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleContextSwitch = async (name: string) => {
    const res = await runForgeos(["config", "use-context", name]);
    if (res.ok) {
      toast.success(`Switched to context: ${name}`);
      window.location.reload();
    } else {
      toast.error(`Failed to switch context: ${res.stderr}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-bg text-text font-mono">
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{ style: { background: "#161b22", borderColor: "#30363d" } }}
      />

      {/* Top bar — 24px */}
      <header className="h-6 px-3 flex items-center justify-between border-b border-border bg-surface text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-bright font-semibold">forgeos</span>
          <span className="text-dim">·</span>
          <ContextSwitcher onSwitch={() => window.location.reload()} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-dim hidden sm:inline">⌘K</span>
          <span className="text-dim ml-1">?</span>
          <span
            className={`inline-block w-2 h-2 rounded-full ml-1 ${ok ? "bg-ok" : "bg-danger"}`}
            aria-label={ok ? "ok" : "error"}
          />
          <span className={ok ? "text-ok" : "text-danger"}>{ok ? "ok" : "error"}</span>
        </div>
      </header>

      {/* Tab strip — 32px */}
      <nav
        role="tablist"
        aria-label="Lens tabs"
        className="h-8 flex items-end border-b border-border bg-surface text-xs shrink-0"
      >
        {TABS.map((t, i) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              title={`⌘${i + 1}`}
              className={[
                "px-3 h-full flex items-center border-b-2 -mb-px",
                active ? "border-info text-bright" : "border-transparent text-dim hover:text-text",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4">
        <TabContent tab={tab} onSelectAgent={setSelectedAgentId} />
      </main>

      {/* Bottom bar (TODO: polish per spec north star) */}
      <StatusBar />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={(k) => {
          setTab(k);
          setPaletteOpen(false);
        }}
        onAgentSelect={(id) => {
          setSelectedAgentId(id);
          setPaletteOpen(false);
        }}
        onContextSwitch={handleContextSwitch}
      />

      <KeyboardShortcutsOverlay
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {selectedAgentId && (
        <AgentDetailSheet
          agentId={selectedAgentId}
          onClose={() => setSelectedAgentId(null)}
        />
      )}
    </div>
  );
}

function TabContent({ tab, onSelectAgent }: { tab: TabKey; onSelectAgent: (id: string) => void }) {
  switch (tab) {
    case "fleet":
      return (
        <TabErrorBoundary name="Fleet">
          <FleetTab onSelectAgent={onSelectAgent} />
        </TabErrorBoundary>
      );
    case "governance":
      return (
        <TabErrorBoundary name="Governance">
          <GovernanceTab />
        </TabErrorBoundary>
      );
    case "logs":
      return (
        <TabErrorBoundary name="Logs">
          <LogsTab />
        </TabErrorBoundary>
      );
    case "topology":
      return (
        <TabErrorBoundary name="Topology">
          <TopologyTab onSelectAgent={onSelectAgent} />
        </TabErrorBoundary>
      );
    case "mcp":
      return (
        <TabErrorBoundary name="MCP">
          <McpTab />
        </TabErrorBoundary>
      );
    case "manifest":
      return (
        <TabErrorBoundary name="Manifest">
          <ManifestTab />
        </TabErrorBoundary>
      );
  }
}
