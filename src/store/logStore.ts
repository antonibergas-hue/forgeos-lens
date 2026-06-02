import { create } from "zustand";
import type { LogEntry } from "../lib/types";

const MAX_LINES = 2000; // cap memory for long-running --follow streams

// Filter presets for log chips
export type FilterKey = "all" | "runs" | "tools" | "errors";
export const FILTERS: { key: FilterKey; label: string; kind: string[] }[] = [
  { key: "all", label: "All", kind: [] },
  { key: "runs", label: "Runs", kind: ["started", "completed"] },
  { key: "tools", label: "Tools", kind: ["tool"] },
  { key: "errors", label: "Errors", kind: ["failed"] },
];

interface LogState {
  agentId: string | null;
  entries: LogEntry[];
  expanded: Set<number>;       // set of entry indices whose tool detail is expanded
  focusedIdx: number | null;   // keyboard focus for ↑/↓ nav
  nextIdx: number;             // auto-incremented counter for unique indices

  // Live-tail polish state
  filterKey: FilterKey;
  isPaused: boolean;
  isAtBottom: boolean;

  setAgent: (id: string | null) => void;
  append: (entry: LogEntry) => void;
  appendBatch: (entries: LogEntry[]) => void;
  clear: () => void;
  toggleExpand: (idx: number) => void;
  expandUp: () => void;        // move focus ↑, expand if on a tool call
  expandDown: () => void;      // move focus ↓, expand if on a tool call
  toggleFocused: () => void;   // space key — toggle expand of focused entry
  setFocused: (idx: number | null) => void;

  // Live-tail polish actions
  setFilter: (key: FilterKey) => void;
  setPaused: (paused: boolean) => void;
  setIsAtBottom: (atBottom: boolean) => void;

  // Derived helpers
  getFilteredEntries: () => LogEntry[];
}

export const useLogStore = create<LogState>((set, get) => ({
  agentId: null,
  entries: [],
  expanded: new Set(),
  focusedIdx: null,
  nextIdx: 0,

  filterKey: "all",
  isPaused: false,
  isAtBottom: true,

  setAgent: (id) => set({ agentId: id, entries: [], expanded: new Set(), focusedIdx: null }),

  append: (entry) =>
    set((s) => {
      const entries = [...s.entries, entry].slice(-MAX_LINES);
      return { entries, nextIdx: s.nextIdx + 1 };
    }),

  appendBatch: (batch) =>
    set((s) => ({
      entries: [...s.entries, ...batch].slice(-MAX_LINES),
      nextIdx: s.nextIdx + batch.length,
    })),

  clear: () => set({ entries: [], expanded: new Set(), focusedIdx: null }),

  toggleExpand: (idx) =>
    set((s) => {
      const next = new Set(s.expanded);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { expanded: next };
    }),

  expandUp: () =>
    set((s) => {
      const entries = s.entries;
      const focused = s.focusedIdx;
      let idx = focused != null ? focused : entries.length - 1;
      // Walk up to find a "tool" kind entry
      for (let i = idx; i >= 0; i--) {
        if (entries[i]?.kind === "tool") {
          const newExpanded = new Set(s.expanded);
          newExpanded.add(i);
          return { focusedIdx: i, expanded: newExpanded };
        }
      }
      // If nothing above, just move focus up one
      return { focusedIdx: Math.max(0, idx - 1) };
    }),

  expandDown: () =>
    set((s) => {
      const entries = s.entries;
      const focused = s.focusedIdx;
      let idx = focused != null ? focused : 0;
      for (let i = idx; i < entries.length; i++) {
        if (entries[i]?.kind === "tool") {
          const newExpanded = new Set(s.expanded);
          newExpanded.add(i);
          return { focusedIdx: i, expanded: newExpanded };
        }
      }
      // Nothing below, move down one
      return { focusedIdx: Math.min(entries.length - 1, idx + 1) };
    }),

  toggleFocused: () =>
    set((s) => {
      if (s.focusedIdx == null) return s;
      const next = new Set(s.expanded);
      if (next.has(s.focusedIdx)) next.delete(s.focusedIdx);
      else next.add(s.focusedIdx);
      return { expanded: next };
    }),

  setFocused: (idx) => set({ focusedIdx: idx }),

  // Live-tail polish actions
  setFilter: (key) => set({ filterKey: key }),
  setPaused: (paused) => set({ isPaused: paused }),
  setIsAtBottom: (atBottom) => set({ isAtBottom: atBottom }),

  getFilteredEntries: () => {
    const { entries, filterKey } = get();
    const filter = FILTERS.find((f) => f.key === filterKey);
    if (!filter || filter.kind.length === 0) return entries;
    return entries.filter((e) => filter.kind.includes(e.kind));
  },
}));
