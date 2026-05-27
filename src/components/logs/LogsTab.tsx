import { useEffect, useRef } from "react";
import { useForgeos } from "../../hooks/useForgeos";
import { Agent } from "../../lib/types";
import { startLogStream, LogStreamHandle } from "../../lib/logStream";
import { useLogStore } from "../../store/logStore";

// Logs tab: pick an agent, stream `forgeos logs <id> --follow` line-by-line
// into the Zustand log store. The child process is killed on agent switch,
// tab unmount, and window close (TODO #7).
export function LogsTab() {
  const { data: agents } = useForgeos<Agent[]>({ args: ["list", "--json"] });
  const agentId = useLogStore((s) => s.agentId);
  const lines = useLogStore((s) => s.lines);
  const setAgent = useLogStore((s) => s.setAgent);
  const append = useLogStore((s) => s.append);
  const clear = useLogStore((s) => s.clear);

  const handleRef = useRef<LogStreamHandle | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function stop() {
    if (handleRef.current) {
      await handleRef.current.kill();
      handleRef.current = null;
    }
  }

  async function select(id: string) {
    await stop();
    setAgent(id || null);
    if (id) {
      try {
        handleRef.current = await startLogStream(id, (line) => append(line));
      } catch (e) {
        append(`[stream error] ${String(e)}`);
      }
    }
  }

  // Kill the child on unmount and on window close.
  useEffect(() => {
    const onUnload = () => {
      void stop();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      void stop();
    };
  }, []);

  // Autoscroll to the newest line.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="text-xs h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <select
          aria-label="Agent"
          value={agentId ?? ""}
          onChange={(e) => select(e.target.value)}
          className="bg-surface text-text border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-info"
        >
          <option value="">Select an agent…</option>
          {(agents ?? []).map((a) => (
            <option key={a.agent_id} value={a.agent_id}>
              {a.name} ({a.agent_id.slice(0, 8)})
            </option>
          ))}
        </select>
        {agentId && (
          <span className="inline-flex items-center gap-1 text-ok">
            <span className="inline-block w-2 h-2 rounded-full bg-ok animate-pulse" />
            following
          </span>
        )}
        <button
          onClick={clear}
          className="ml-auto text-dim hover:text-text border border-border rounded px-2 py-0.5"
        >
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-bg border border-border rounded p-2 font-mono whitespace-pre-wrap leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-dim">
            {agentId ? "Waiting for log output…" : "Pick an agent to stream its logs."}
          </p>
        ) : (
          lines.map((l, i) => (
            <div key={i} className="text-text">
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
