import { useCallback, useEffect, useState } from "react";
import { runForgeos, parseContextsTable } from "../../lib/forgeos";

interface Ctx {
  name: string;
  current?: boolean;
}

// Reads `forgeos config get-contexts` (a plain-text table — there is no --json
// flag), renders a <select>, and switches the active context via
// `forgeos config use-context <name>`. On switch it reloads so every tab
// re-runs its queries against the new endpoint.
//
// Table shape:
//   CUR     NAME        AUTH    SERVER
//   ------  ----------  ------  ------------------------------
//   *       cloud-run   bearer  https://…
//           prod        bearer  https://…
export function ContextSwitcher({ onSwitch }: { onSwitch?: (name: string) => void }) {
  const [contexts, setContexts] = useState<Ctx[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await runForgeos(["config", "get-contexts"]);
    if (!res.ok) return;

    const list: Ctx[] = parseContextsTable(res.stdout);
    const cur = list.find((c) => c.current)?.name ?? "";

    setContexts(list);
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
