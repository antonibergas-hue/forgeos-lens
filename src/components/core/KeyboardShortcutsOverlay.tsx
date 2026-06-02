import { useCallback } from "react";
import { X } from "lucide-react";

// Dense monospace keyboard-shortcuts overlay — `?` or `Shift+/` to toggle.
// Matches the "htop-meets-issue-tracker" spec: every pixel informative.

interface Shortcut {
  key: string;
  desc: string;
}

const GROUPS: { label: string; shortcuts: Shortcut[] }[] = [
  {
    label: "Navigation",
    shortcuts: [
      { key: "⌘1–6", desc: "Switch tabs" },
      { key: "⌘K", desc: "Command palette" },
      { key: "?", desc: "Toggle this overlay" },
    ],
  },
  {
    label: "Fleet",
    shortcuts: [
      { key: "j / k", desc: "Move row focus up/down" },
      { key: "Enter", desc: "Open agent detail sheet" },
      { key: "/", desc: "Focus search input" },
      { key: "Esc", desc: "Blur search" },
    ],
  },
  {
    label: "Logs",
    shortcuts: [
      { key: "↑ / ↓", desc: "Navigate log entries" },
      { key: "Space", desc: "Toggle tool-call expansion" },
    ],
  },
  {
    label: "Command Palette",
    shortcuts: [
      { key: "↑ / ↓", desc: "Navigate results" },
      { key: "Ctrl+N / Ctrl+P", desc: "Navigate results (alt)" },
      { key: "Enter", desc: "Select result" },
      { key: "Esc", desc: "Close palette" },
    ],
  },
  {
    label: "General",
    shortcuts: [
      { key: "Esc", desc: "Close modals / sheets" },
    ],
  },
];

export function KeyboardShortcutsOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement) === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={handleBackdrop}
    >
      {/* Dim backdrop */}
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-[2px]" />

      {/* Panel */}
      <div className="relative z-[60] w-full max-w-[520px] bg-surface border border-border rounded-lg shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg/50">
          <div className="flex items-center gap-2">
            <span className="text-bright text-[12px] font-semibold tracking-tight">
              KEYBOARD SHORTCUTS
            </span>
            <span className="text-dim text-[10px]">— forgeos-lens v0.1.0</span>
          </div>
          <button
            onClick={onClose}
            className="text-dim hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Groups */}
        <div className="max-h-[65vh] overflow-y-auto py-2 px-4">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-3 last:mb-0">
              <div className="text-[10px] uppercase tracking-wider text-dim/70 font-bold mb-1 pb-1 border-b border-border/30">
                {group.label}
              </div>
              <div className="flex flex-col">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.key + s.desc}
                    className="flex items-baseline gap-3 py-1 px-1"
                  >
                    <kbd className="shrink-0 bg-bg/80 border border-border rounded-sm px-1.5 py-0.5 text-[10px] text-info min-w-[70px] text-center font-bold tracking-wide">
                      {s.key}
                    </kbd>
                    <span className="text-text text-[11px]">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-bg/30 text-[10px] text-dim flex items-center justify-between">
          <span>Press <kbd className="bg-border/50 px-1 rounded text-text/80">?</kbd> to toggle</span>
          <span>⌘ = Cmd / Ctrl</span>
        </div>
      </div>
    </div>
  );
}
