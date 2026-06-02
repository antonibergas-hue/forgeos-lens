import { useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { useForgeos } from "../../hooks/useForgeos";
import { Agent, LogEntry, ToolCallDetail } from "../../lib/types";
import { startLogStream, LogStreamHandle, entryToString } from "../../lib/logStream";
import { useLogStore, FILTERS } from "../../store/logStore";
import { SkeletonBlock } from "../core/Skeleton";

export function LogsTab() {
  const { data: agents, isLoading } = useForgeos<Agent[]>({ args: ["list", "--json"] });
  const agentId = useLogStore((s) => s.agentId);
  const entries = useLogStore((s) => s.entries);
  const expanded = useLogStore((s) => s.expanded);
  const focusedIdx = useLogStore((s) => s.focusedIdx);
  const filterKey = useLogStore((s) => s.filterKey);
  const isPaused = useLogStore((s) => s.isPaused);
  const isAtBottom = useLogStore((s) => s.isAtBottom);

  const setAgent = useLogStore((s) => s.setAgent);
  const append = useLogStore((s) => s.append);
  const clear = useLogStore((s) => s.clear);
  const toggleExpand = useLogStore((s) => s.toggleExpand);
  const expandUp = useLogStore((s) => s.expandUp);
  const expandDown = useLogStore((s) => s.expandDown);
  const toggleFocused = useLogStore((s) => s.toggleFocused);
  const setFilter = useLogStore((s) => s.setFilter);
  const setPaused = useLogStore((s) => s.setPaused);
  const setIsAtBottom = useLogStore((s) => s.setIsAtBottom);

  const handleRef = useRef<LogStreamHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function stop() {
    if (handleRef.current) {
      await handleRef.current.kill();
      handleRef.current = null;
    }
  }

  async function start(id: string) {
    if (!id) return;
    try {
      handleRef.current = await startLogStream(id, (entry) => {
        // If paused, we don't append. Simple implementation: kill/start on pause/resume.
        append(entry);
      });
    } catch (e) {
      append({
        idx: Date.now(),
        time: "",
        kind: "failed",
        msg: `[stream error] ${String(e)}`,
      });
    }
  }

  async function select(id: string) {
    await stop();
    setAgent(id || null);
    setPaused(false);
    if (id) {
      await start(id);
    }
  }

  async function togglePause() {
    if (isPaused) {
      if (agentId) await start(agentId);
      setPaused(false);
      toast.info("Resumed log stream");
    } else {
      await stop();
      setPaused(true);
      toast.info("Paused log stream");
    }
  }

  const copyToClipboard = () => {
    const text = filteredEntries.map(entryToString).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Logs copied to clipboard", {
      description: `${filteredEntries.length} lines copied.`
    });
  };

  useEffect(() => {
    const onUnload = () => { void stop(); };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      void stop();
    };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement?.tagName === "SELECT") return;
      if (e.key === "ArrowUp") { e.preventDefault(); expandUp(); }
      if (e.key === "ArrowDown") { e.preventDefault(); expandDown(); }
      if (e.key === " ") { e.preventDefault(); toggleFocused(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expandUp, expandDown, toggleFocused]);

  // Derived filtered entries
  const filteredEntries = useMemo(() => {
    const filter = FILTERS.find((f) => f.key === filterKey);
    if (!filter || filter.kind.length === 0) return entries;
    return entries.filter((e) => filter.kind.includes(e.kind));
  }, [entries, filterKey]);

  // Smart auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el && isAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [entries, isAtBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
    if (atBottom !== isAtBottom) {
      setIsAtBottom(atBottom);
    }
  };

  return (
    <div className="text-[11px] h-full flex flex-col bg-bg">
      <div className="flex items-center gap-2 mb-2 p-1 flex-wrap">
        {isLoading && !agents ? (
          <SkeletonBlock width="w-48" height="h-6" />
        ) : (
          <select
            aria-label="Agent"
            value={agentId ?? ""}
            onChange={(e) => select(e.target.value)}
            className="bg-surface text-text border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-info text-[11px]"
          >
            <option value="">Select an agent…</option>
            {(agents ?? []).map((a) => (
              <option key={a.agent_id} value={a.agent_id}>
                {a.name} ({a.agent_id.slice(0, 8)})
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1 border-l border-border pl-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                filterKey === f.key
                  ? "bg-info/20 text-info border border-info/30"
                  : "text-dim hover:text-text border border-transparent"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {agentId && (
          <span className={`inline-flex items-center gap-1 ${isPaused ? "text-warn" : "text-ok"}`}>
            <span className={`inline-block w-2 h-2 rounded-full ${isPaused ? "bg-warn" : "bg-ok animate-pulse"}`} />
            {isPaused ? "paused" : "following"}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-dim mr-2 hidden lg:inline">
            {filteredEntries.length} lines · ↑/↓ nav · space expand
          </span>
          {agentId && (
            <button
              onClick={togglePause}
              className={`text-dim hover:text-text border border-border rounded px-2 py-0.5 transition-colors ${
                isPaused ? "bg-warn/10 border-warn/30" : ""
              }`}
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
          )}
          <button
            onClick={copyToClipboard}
            disabled={filteredEntries.length === 0}
            className="text-dim hover:text-text border border-border rounded px-2 py-0.5 disabled:opacity-50"
          >
            Copy
          </button>
          <button
            onClick={clear}
            className="text-dim hover:text-text border border-border rounded px-2 py-0.5"
          >
            Clear
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto bg-bg border border-border rounded-md font-mono leading-relaxed relative"
      >
        {filteredEntries.length === 0 ? (
          <div className="p-4 text-dim">
            {agentId
              ? entries.length > 0
                ? "No logs match the current filter."
                : "Waiting for log output…"
              : "Pick an agent to stream its logs."}
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredEntries.map((entry, i) => (
              <LogLine
                key={entry.idx}
                entry={entry}
                isExpanded={expanded.has(i)}
                isFocused={focusedIdx === i}
                onToggle={() => toggleExpand(i)}
              />
            ))}
          </div>
        )}

        {!isAtBottom && entries.length > 0 && (
          <button
            onClick={() => {
              setIsAtBottom(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="absolute bottom-4 right-4 bg-surface/90 border border-border rounded px-2 py-1 text-info text-[10px] shadow-lg animate-in fade-in slide-in-from-bottom-2"
          >
            ↓ Resume auto-scroll
          </button>
        )}
      </div>
    </div>
  );
}

function LogLine({
  entry,
  isExpanded,
  isFocused,
  onToggle,
}: {
  entry: LogEntry;
  isExpanded: boolean;
  isFocused: boolean;
  onToggle: () => void;
}) {
  const isTool = entry.kind === "tool";
  const color =
    entry.kind === "started"
      ? "text-cyan"
      : entry.kind === "completed"
      ? "text-ok"
      : entry.kind === "failed"
      ? "text-danger"
      : entry.kind === "tool"
      ? "text-orange"
      : "text-dim";

  return (
    <div
      className={`group border-l-2 ${
        isFocused ? "bg-surface/50 border-info" : "border-transparent hover:bg-surface/30"
      }`}
    >
      <div
        onClick={isTool ? onToggle : undefined}
        className={`flex items-center gap-2 px-2 py-0.5 cursor-pointer ${isTool ? "" : "cursor-default"}`}
      >
        <span className="text-[10px] text-dim w-12 shrink-0">{entry.time}</span>
        <span className={`w-16 shrink-0 font-bold ${color}`}>{entry.kind}</span>
        <span className="flex-1 truncate text-text whitespace-pre-wrap">{entry.msg}</span>
        {isTool && (
          <span className="text-dim group-hover:text-text transition-colors">
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
      </div>

      {isTool && isExpanded && entry.tool && (
        <ToolDetail detail={entry.tool} />
      )}
    </div>
  );
}

function ToolDetail({ detail }: { detail: ToolCallDetail }) {
  return (
    <div className="mx-14 mb-2 p-2 bg-surface border border-border rounded-sm text-[10px] space-y-2">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-dim">
        <div>
          <span className="text-bright">cwd:</span> {detail.cwd}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-bright">returncode:</span>
          <span className={`px-1 rounded ${detail.returncode === 0 ? "bg-ok/20 text-ok" : "bg-danger/20 text-danger"}`}>
            {detail.returncode}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-bright">cmd:</span> <code className="text-text">{detail.cmd}</code>
        </div>
        {detail.pr_url && (
          <div className="col-span-2">
            <span className="text-bright">pr:</span>{" "}
            <a href={detail.pr_url} target="_blank" className="text-info hover:underline">
              {detail.pr_url}
            </a>
          </div>
        )}
      </div>

      {(detail.stdout_tail || detail.stderr_tail) && (
        <div className="space-y-1">
          {detail.stdout_tail && (
            <div>
              <div className="text-bright mb-1">stdout_tail:</div>
              <pre className="p-1.5 bg-bg border border-border rounded overflow-x-auto text-text max-h-32">
                {detail.stdout_tail}
              </pre>
            </div>
          )}
          {detail.stderr_tail && (
            <div>
              <div className="text-danger mb-1 font-semibold">stderr_tail:</div>
              <pre className="p-1.5 bg-bg border border-border rounded overflow-x-auto text-danger max-h-32">
                {detail.stderr_tail}
              </pre>
            </div>
          )}
        </div>
      )}

      {detail.files_changed && detail.files_changed.length > 0 && (
        <div>
          <div className="text-bright mb-1">files_changed:</div>
          <div className="flex flex-wrap gap-1">
            {detail.files_changed.map((f) => (
              <span key={f} className="px-1 bg-surface border border-border rounded text-dim">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
