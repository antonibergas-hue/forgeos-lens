import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { runForgeos } from "../../lib/forgeos";
import { ContextHealth, ConnectionState } from "../../lib/types";
import { SkeletonRow } from "../core/Skeleton";

interface ContextEntry {
  name: string;
  current: boolean;
}

/**
 * ClusterTab — CONTEXT-HEALTH detail panel.
 *
 * Lists all contexts from `forgeos config get-contexts --json` and probes
 * each one's health via `forgeos health --context <name> --json`.
 *
 * Features: per-context latency, version, connection state, last-error,
 * and manual refresh.
 */
export function ClusterTab() {
  const [contexts, setContexts] = useState<ContextEntry[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, ContextHealth>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const probeHealth = useCallback(async (name: string) => {
    setRefreshing(name);
    try {
      const res = await runForgeos<ContextHealth>(["health", "--context", name, "--json"]);
      if (res.ok && res.parsed) {
        setHealthMap((prev) => ({ ...prev, [name]: res.parsed! }));
      } else {
        // Fallback for failed health check
        setHealthMap((prev) => ({
          ...prev,
          [name]: {
            name,
            version: "unknown",
            connection: "disconnected",
            latency_ms: null,
            last_error: res.stderr || "Probing failed",
            checked_at: new Date().toISOString(),
          },
        }));
      }
    } catch (e: any) {
      setHealthMap((prev) => ({
        ...prev,
        [name]: {
          name,
          version: "unknown",
          connection: "disconnected",
          latency_ms: null,
          last_error: e.message || "Unknown error",
          checked_at: new Date().toISOString(),
        },
      }));
    } finally {
      setRefreshing(null);
    }
  }, []);

  const loadContexts = useCallback(async () => {
    setLoading(true);
    const res = await runForgeos<ContextEntry[]>(["config", "get-contexts", "--json"]);
    if (res.ok && Array.isArray(res.parsed)) {
      setContexts(res.parsed);
      // Probe all contexts
      await Promise.all(res.parsed.map((c) => probeHealth(c.name)));
    }
    setLoading(false);
  }, [probeHealth]);

  useEffect(() => {
    loadContexts();
  }, [loadContexts]);

  const refreshAll = () => {
    loadContexts();
  };

  return (
    <div className="text-xs h-full flex flex-col font-mono">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-info" />
          <h2 className="text-bright font-semibold text-sm">Context Health</h2>
          <span className="text-dim text-[10px] ml-2 uppercase tracking-widest border border-border px-1.5 py-0.5 rounded">Cluster</span>
        </div>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center gap-1 text-dim hover:text-text border border-border rounded px-2 py-1 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh All
        </button>
      </div>

      <div className="flex-1 overflow-auto border border-border rounded bg-bg">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-surface z-10 shadow-sm">
            <tr className="text-dim text-left border-b border-border select-none uppercase text-[10px] tracking-tight">
              <th className="py-2 px-3 font-normal">Context</th>
              <th className="py-2 px-3 font-normal text-center">Status</th>
              <th className="py-2 px-3 font-normal text-center">Latency</th>
              <th className="py-2 px-3 font-normal">Version</th>
              <th className="py-2 px-3 font-normal">Last Check</th>
              <th className="py-2 px-3 font-normal">Details</th>
              <th className="py-2 px-3 font-normal w-10"></th>
            </tr>
          </thead>
          <tbody>
            {loading && contexts.length === 0 ? (
              <>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} columns={6} />
                ))}
              </>
            ) : (
              contexts.map((c) => {
                const health = healthMap[c.name];
                return (
                  <tr
                    key={c.name}
                    className="border-b border-border/30 hover:bg-surface/30 transition-colors"
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-bright font-medium">{c.name}</span>
                        {c.current && (
                          <span className="text-[9px] bg-info/20 text-info px-1 rounded border border-info/30">current</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex justify-center">
                        <StatusIndicator state={health?.connection || "unknown"} />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {health?.latency_ms !== null && health?.latency_ms !== undefined ? (
                        <span className={`${health.latency_ms > 200 ? "text-warn" : "text-ok"}`}>
                          {health.latency_ms}ms
                        </span>
                      ) : (
                        <span className="text-dim">--</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-dim">
                      {health?.version || "..."}
                    </td>
                    <td className="py-2 px-3 text-dim flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {health?.checked_at ? new Date(health.checked_at).toLocaleTimeString() : "..."}
                    </td>
                    <td className="py-2 px-3">
                      {health?.last_error ? (
                        <span className="text-danger truncate max-w-[200px] block" title={health.last_error}>
                          {health.last_error}
                        </span>
                      ) : (
                        <span className="text-ok">Healthy</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => probeHealth(c.name)}
                        className="p-1 hover:text-bright text-dim transition-colors"
                        title="Refresh context"
                      >
                        <RefreshCw className={`w-3 h-3 ${refreshing === c.name ? "animate-spin" : ""}`} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-surface border border-border rounded">
        <h3 className="text-bright font-semibold mb-2">CLI Integration Note</h3>
        <p className="text-dim leading-relaxed">
          The Cluster health view requires <code>forgeos health --context &lt;name&gt; --json</code> support.
          If this flag is missing in your CLI version, results may fall back to the current context or show as disconnected.
        </p>
      </div>
    </div>
  );
}

function StatusIndicator({ state }: { state: ConnectionState }) {
  switch (state) {
    case "connected":
      return (
        <span className="flex items-center gap-1.5 text-ok bg-ok/10 px-2 py-0.5 rounded-full border border-ok/30">
          <CheckCircle2 className="w-3 h-3" />
          <span className="uppercase text-[9px] font-bold">Connected</span>
        </span>
      );
    case "disconnected":
      return (
        <span className="flex items-center gap-1.5 text-danger bg-danger/10 px-2 py-0.5 rounded-full border border-danger/30">
          <AlertCircle className="w-3 h-3" />
          <span className="uppercase text-[9px] font-bold">Offline</span>
        </span>
      );
    case "degraded":
      return (
        <span className="flex items-center gap-1.5 text-warn bg-warn/10 px-2 py-0.5 rounded-full border border-warn/30">
          <AlertCircle className="w-3 h-3" />
          <span className="uppercase text-[9px] font-bold">Degraded</span>
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 text-dim bg-dim/10 px-2 py-0.5 rounded-full border border-dim/30">
          <Clock className="w-3 h-3" />
          <span className="uppercase text-[9px] font-bold">Probing</span>
        </span>
      );
  }
}
