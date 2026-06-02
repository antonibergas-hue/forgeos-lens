import { useEffect, useState, useMemo, useRef } from "react";
import { TABS, TabKey } from "../../App";
import { useForgeos } from "../../hooks/useForgeos";
import { Agent } from "../../lib/types";
import { runForgeos } from "../../lib/forgeos";
import { Search, Command, Zap, Layout, User, Globe } from "lucide-react";

// Command Center: ⌘K fuzzy filter over tabs, agents, contexts, and actions.
export function CommandPalette({
  open,
  onClose,
  onNavigate,
  onAgentSelect,
  onContextSwitch,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (k: TabKey) => void;
  onAgentSelect: (id: string) => void;
  onContextSwitch: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: agents } = useForgeos<Agent[]>({
    args: ["list", "--json"],
    skip: !open,
  });

  // Extract contexts from the plain-text table
  const [contexts, setContexts] = useState<string[]>([]);
  useEffect(() => {
    if (open) {
      runForgeos(["config", "get-contexts"]).then((res) => {
        if (!res.ok) return;
        const names: string[] = [];
        for (const raw of res.stdout.split("\n")) {
          const trimmed = raw.trim();
          if (!trimmed || trimmed.startsWith("CUR") || /^-+/.test(trimmed)) continue;
          const isCurrent = raw.trimStart().startsWith("*");
          const cols = trimmed.split(/\s+/);
          names.push(isCurrent ? cols[1] : cols[0]);
        }
        setContexts(names);
      });
    }
  }, [open]);

  const items = useMemo(() => {
    const res: Array<{
      id: string;
      label: string;
      sub?: string;
      group: "Navigation" | "Agents" | "Contexts" | "Actions";
      icon: React.ReactNode;
      onPick: () => void;
    }> = [];

    const query = q.toLowerCase();

    // 1. Navigation
    TABS.forEach((t) => {
      if (t.label.toLowerCase().includes(query)) {
        res.push({
          id: `nav-${t.key}`,
          label: `Jump to ${t.label}`,
          group: "Navigation",
          icon: <Layout className="w-3.5 h-3.5" />,
          onPick: () => onNavigate(t.key),
        });
      }
    });

    // 2. Agents
    (agents || []).forEach((a) => {
      if (a.name.toLowerCase().includes(query) || a.agent_id.toLowerCase().includes(query)) {
        res.push({
          id: `agent-${a.agent_id}`,
          label: a.name,
          sub: a.agent_id.slice(0, 8),
          group: "Agents",
          icon: <User className="w-3.5 h-3.5" />,
          onPick: () => onAgentSelect(a.agent_id),
        });
      }
    });

    // 3. Contexts
    contexts.forEach((c) => {
      if (c.toLowerCase().includes(query)) {
        res.push({
          id: `ctx-${c}`,
          label: `Switch to context: ${c}`,
          group: "Contexts",
          icon: <Globe className="w-3.5 h-3.5" />,
          onPick: () => onContextSwitch(c),
        });
      }
    });

    // 4. Actions
    if ("reload".includes(query)) {
      res.push({
        id: "action-reload",
        label: "Reload App",
        group: "Actions",
        icon: <Zap className="w-3.5 h-3.5" />,
        onPick: () => window.location.reload(),
      });
    }

    return res;
  }, [q, agents, contexts, onNavigate, onAgentSelect, onContextSwitch]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Keep index in bounds
  useEffect(() => {
    if (selectedIndex >= items.length) {
      setSelectedIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, selectedIndex]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % items.length);
    }
    if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + items.length) % items.length);
    }
    if (e.key === "Enter" && items[selectedIndex]) {
      items[selectedIndex].onPick();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-[540px] bg-surface border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono">
        <div className="flex items-center px-3 py-3 border-b border-border bg-bg/50">
          <Search className="w-4 h-4 text-dim mr-3" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search agents, tabs, contexts..."
            className="flex-1 bg-transparent text-bright text-sm focus:outline-none placeholder:text-dim/60"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="bg-border/50 text-dim text-[10px] px-1.5 py-0.5 rounded border border-border/50">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[380px] overflow-y-auto py-2">
          {items.length > 0 ? (
            <div className="flex flex-col">
              {items.map((it, i) => {
                const isSelected = i === selectedIndex;
                const showGroup = i === 0 || items[i - 1].group !== it.group;

                return (
                  <div key={it.id}>
                    {showGroup && (
                      <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-dim/60 font-bold bg-border/10">
                        {it.group}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        it.onPick();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                        ${isSelected ? "bg-info/10 text-info" : "text-dim hover:bg-border/30 hover:text-text"}
                      `}
                    >
                      <div className={`${isSelected ? "text-info" : "text-dim"}`}>{it.icon}</div>
                      <div className="flex-1 flex items-baseline gap-2">
                        <span className="text-[12px] font-medium">{it.label}</span>
                        {it.sub && <span className="text-[10px] opacity-60">#{it.sub}</span>}
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] opacity-60">
                          <span>Enter</span>
                          <Command className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-12 py-12 text-center">
              <p className="text-dim text-xs">No results found for "{q}"</p>
            </div>
          )}
        </div>

        <div className="px-3 py-2 border-t border-border bg-bg/30 flex items-center justify-between text-[10px] text-dim">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-border/50 px-1 rounded">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-border/50 px-1 rounded">↵</kbd> select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-info" />
            <span>Command Center v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
