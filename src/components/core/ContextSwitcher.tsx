import { useCallback, useEffect, useState } from "react";
import { runForgeos } from "../../lib/forgeos";

interface Ctx {
  name: string;
  server?: string;
  current?: boolean;
}

interface ContextsPayload {
  contexts?: Ctx[];
  current_context?: string;
}

// Reads `forgeos config get-contexts --json`, renders a <select>, and switches
// the active context via `forgeos config use-context <name>`. On switch it
// reloads so every tab re-runs its queries against the new endpoint.
export function ContextSwitcher({ onSwitch }: { onSwitch?: (name: string) => void }) {
  const [contexts, setContexts] = useState<Ctx[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await runForgeos<ContextsPayload | Ctx[]>([
      "config",
      "get-contexts",
      "--json",
    ]);
    if (!res.ok || !res.parsed) return;
    const p = res.parsed as ContextsPayload | Ctx[];
    const list: Ctx[] = Array.isArray(p) ? p : p.contexts ?? [];
    setContexts(list);
    const cur = Array.isArray(p)
      ? list.find((c) => c.current)?.name ?? ""
      : p.current_context ?? "";
    setCurrent(cur || list[0]?.name || "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function switchTo(name: string) {
    if (!name || name === current) return;
    setBusy(true);
    const res = await runForgeos(["config", "use-context", name]);
    setBusy(false);
    if (res.ok) {
      setCurrent(name);
      onSwitch?.(name);
    }
  }

  if (contexts.length === 0) {
    return <span className="text-dim">{current || "no context"}</span>;
  }

  return (
    <select
      aria-label="ForgeOS context"
      value={current}
      disabled={busy}
      onChange={(e) => switchTo(e.target.value)}
      className="bg-surface text-dim border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-info hover:text-text disabled:opacity-50"
    >
      {contexts.map((c) => (
        <option key={c.name} value={c.name}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
