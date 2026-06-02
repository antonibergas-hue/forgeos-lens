import { Agent } from "../../lib/types";

/**
 * FleetBar — MC-style phase-count strip (polish per spec north star).
 *
 * Renders fat coloured pills with running / idle / failed / scheduled
 * counts above the fleet table.  Mirrors Mission Control's <FleetBar />.
 */

// Phase colour helpers
// Each phase maps to a pre-compiled set of Tailwind classes so we avoid
// dynamic string interpolation (Tailwind v4 CSS-first needs static
// class names to be tree-shakeable).
type PhaseColor = {
  dot: string;
  text: string;
  bg: string;
  border: string;
};

const PHASE_STYLES: Record<string, PhaseColor> = {
  running: {
    dot: "bg-info",
    text: "text-info",
    bg: "bg-info/10",
    border: "border-info",
  },
  idle: {
    dot: "bg-ok",
    text: "text-ok",
    bg: "bg-ok/10",
    border: "border-ok",
  },
  completed: {
    dot: "bg-ok",
    text: "text-ok",
    bg: "bg-ok/10",
    border: "border-ok",
  },
  failed: {
    dot: "bg-danger",
    text: "text-danger",
    bg: "bg-danger/10",
    border: "border-danger",
  },
  scheduled: {
    dot: "bg-warn",
    text: "text-warn",
    bg: "bg-warn/10",
    border: "border-warn",
  },
};

const DEFAULT_STYLE: PhaseColor = {
  dot: "bg-dim",
  text: "text-dim",
  bg: "bg-dim/10",
  border: "border-dim",
};

// Canonical phase labels in display order
const PHASE_ORDER = ["running", "idle", "completed", "failed", "scheduled"] as const;

function countByPhase(agents: Agent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of agents) {
    const phase = (a.status || "other").toLowerCase();
    counts[phase] = (counts[phase] || 0) + 1;
  }
  return counts;
}

/** Render a single phase pill. */
function PhasePill({ phase, count }: { phase: string; count: number }) {
  const style = PHASE_STYLES[phase] || DEFAULT_STYLE;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${style.bg} ${style.text} ${style.border}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className="uppercase tracking-wide text-[10px] font-bold">{phase}</span>
      <span className="text-bright">{count}</span>
    </span>
  );
}

export function FleetBar({
  agents,
}: {
  agents: Agent[];
}) {
  const counts = countByPhase(agents);

  return (
    <div className="flex items-center gap-2 text-[11px] font-mono">
      {/* Total count (bright label) */}
      <span className="text-bright font-semibold">{agents.length}</span>
      <span className="text-dim">agents</span>

      {/* Separator */}
      <span className="text-border">·</span>

      {/* Phase pills — only show phases that have agents */}
      {PHASE_ORDER.map((phase) => {
        const n = counts[phase];
        if (!n) return null;
        return <PhasePill key={phase} phase={phase} count={n} />;
      })}

      {/* Show unknown phases not in the canonical order */}
      {Object.entries(counts)
        .filter(([phase]) => !PHASE_ORDER.includes(phase as any))
        .map(([phase, n]) => (
          <span
            key={phase}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dim/50 bg-dim/10 text-dim"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-dim" />
            <span className="uppercase tracking-wide text-[10px] font-bold">{phase}</span>
            <span className="text-dim">{n}</span>
          </span>
        ))}
    </div>
  );
}
