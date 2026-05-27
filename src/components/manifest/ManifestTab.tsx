import { useState } from "react";
import { useForgeos } from "../../hooks/useForgeos";
import { runForgeos } from "../../lib/forgeos";
import { Agent } from "../../lib/types";

// Manifest tab: pick an agent, view its manifest (from `forgeos describe <id>
// --json`) in an editor, and Reapply. Uses a mono <textarea> editor rather
// than pulling in the heavy Monaco bundle (TODO #11).
export function ManifestTab() {
  const { data: agents } = useForgeos<Agent[]>({ args: ["list", "--json"] });
  const [id, setId] = useState("");
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(agentId: string) {
    setId(agentId);
    setMsg("");
    if (!agentId) {
      setText("");
      return;
    }
    const res = await runForgeos(["describe", agentId, "--json"]);
    setText(res.ok ? res.stdout.trim() : res.stderr);
  }

  async function reapply() {
    setBusy(true);
    // The CLI has no in-place update verb yet (deploy creates; it rejects an
    // existing name). Surface that rather than silently no-op.
    const res = await runForgeos(["describe", id, "--json"]);
    setBusy(false);
    setMsg(
      res.ok
        ? "Reapply needs the update endpoint (forgeos has no in-place update verb yet). Manifest re-read."
        : res.stderr
    );
  }

  return (
    <div className="text-xs h-full flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <select
          aria-label="Agent"
          value={id}
          onChange={(e) => load(e.target.value)}
          className="bg-surface text-text border border-border rounded px-1.5 py-0.5 focus:outline-none focus:border-info"
        >
          <option value="">Select an agent…</option>
          {(agents ?? []).map((a) => (
            <option key={a.agent_id} value={a.agent_id}>
              {a.name}
            </option>
          ))}
        </select>
        <button
          disabled={!id || busy}
          onClick={reapply}
          className="text-info border border-info/40 rounded px-2 py-0.5 disabled:opacity-40"
        >
          Reapply
        </button>
        {msg && <span className="text-dim truncate">{msg}</span>}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        placeholder="Pick an agent to view its manifest."
        className="flex-1 bg-bg text-text border border-border rounded p-2 font-mono resize-none focus:outline-none focus:border-info"
      />
    </div>
  );
}
