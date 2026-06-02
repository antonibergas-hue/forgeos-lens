import { useEffect, useState } from "react";
import { runForgeos } from "../../lib/forgeos";

/**
 * StatusBar — thin bottom bar (spec: "The bottom bar shows latency to the
 * active context's API").
 *
 * Measures the round-trip time of `forgeos health` every 5 s and displays
 * the latency alongside the active agent count.  Uses the same surface /
 * border / dim palette so it blends into the MC aesthetic.
 */

export function StatusBar() {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [agentCount, setAgentCount] = useState<number>(0);
  const [connected, setConnected] = useState<boolean>(true);

  useEffect(() => {
    let alive = true;
    const interval = 5_000;

    async function probe() {
      if (!alive) return;
      const start = performance.now();
      try {
        const { ok } = await runForgeos(["health"]);
        const ms = Math.round(performance.now() - start);
        setLatencyMs(ms);
        setConnected(ok);
        if (ok) {
          // Also grab agent count so the status bar is informative
          const { parsed } = await runForgeos<Record<string, never>[]>([
            "list",
            "--json",
          ]);
          if (Array.isArray(parsed)) setAgentCount(parsed.length);
        }
      } catch {
        setConnected(false);
      }
    }

    probe();
    const timer = setInterval(probe, interval);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <footer className="h-5 flex items-center justify-between px-3 border-t border-border bg-surface text-[10px] font-mono shrink-0">
      {/* Left: latency + connection status */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              connected ? "bg-ok" : "bg-danger"
            }`}
          />
          <span className={connected ? "text-dim" : "text-danger"}>
            {connected ? "connected" : "disconnected"}
          </span>
        </span>
        {latencyMs !== null && (
          <span className="text-dim">
            <span className="text-bright">{latencyMs}</span> ms
          </span>
        )}
      </div>

      {/* Right: agent summary + version */}
      <div className="flex items-center gap-3 text-dim">
        <span>
          <span className="text-bright">{agentCount}</span> agents
        </span>
        <span className="text-dim">·</span>
        <span>v0.1.0</span>
      </div>
    </footer>
  );
}
