import { create } from "zustand";

const MAX_LINES = 2000; // cap memory for long-running --follow streams

interface LogState {
  agentId: string | null;
  lines: string[];
  setAgent: (id: string | null) => void;
  append: (line: string) => void;
  clear: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  agentId: null,
  lines: [],
  setAgent: (id) => set({ agentId: id, lines: [] }),
  append: (line) =>
    set((s) => ({ lines: [...s.lines, line].slice(-MAX_LINES) })),
  clear: () => set({ lines: [] }),
}));
