import { useEffect, useState } from "react";
import { TABS, TabKey } from "../../App";

// ⌘K command palette: fuzzy-ish filter over the tabs; Enter/click jumps.
export function CommandPalette({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (k: TabKey) => void;
}) {
  const [q, setQ] = useState("");
  const matches = TABS.filter((t) => t.label.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-[420px] max-w-[90vw] bg-surface border border-border rounded shadow-lg text-xs">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && matches[0]) onPick(matches[0].key);
          }}
          placeholder="Jump to tab…"
          className="w-full bg-bg text-text border-b border-border px-3 py-2 focus:outline-none"
        />
        <ul className="max-h-64 overflow-auto py-1">
          {matches.map((t) => (
            <li key={t.key}>
              <button
                onClick={() => onPick(t.key)}
                className="w-full text-left px-3 py-1.5 text-dim hover:bg-border/40 hover:text-text"
              >
                {t.label}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-3 py-1.5 text-dim">No match.</li>}
        </ul>
      </div>
    </div>
  );
}
