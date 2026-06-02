import { useEffect, useRef, useState } from "react";
import { useForgeos } from "../../hooks/useForgeos";
import { Agent } from "../../lib/types";
import { SkeletonGraph } from "../core/Skeleton";

interface Node { id: string; name: string; x: number; y: number; vx: number; vy: number }
interface Edge { from: string; to: string }

const W = 600;
const H = 400;

// Topology tab: a small force-directed graph of the A2A relationships
// (orchestrator → builder / tester / reviewer), nodes from `forgeos list
// --json`. Lightweight SVG sim, no external graph lib (TODO #9).
export function TopologyTab() {
  const { data, isLoading } = useForgeos<Agent[]>({ args: ["list", "--json"] });
  const agents = data ?? [];
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const [, tick] = useState(0);

  useEffect(() => {
    nodesRef.current = agents.map((a, i) => ({
      id: a.agent_id,
      name: a.name,
      x: W / 2 + Math.cos((i / Math.max(agents.length, 1)) * 2 * Math.PI) * 130,
      y: H / 2 + Math.sin((i / Math.max(agents.length, 1)) * 2 * Math.PI) * 110,
      vx: 0,
      vy: 0,
    }));
    const orch = agents.find((a) => /orchestrator/i.test(a.name));
    const edges: Edge[] = [];
    if (orch) {
      agents
        .filter((a) => /builder|tester|reviewer/i.test(a.name))
        .forEach((t) => edges.push({ from: orch.agent_id, to: t.agent_id }));
    }
    edgesRef.current = edges;
  }, [agents.length]);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    const run = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          const rep = 2400 / (d * d);
          a.vx += (dx / d) * rep;
          a.vy += (dy / d) * rep;
          b.vx -= (dx / d) * rep;
          b.vy -= (dy / d) * rep;
        }
      }
      edges.forEach((e) => {
        const a = nodes.find((n) => n.id === e.from);
        const b = nodes.find((n) => n.id === e.to);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = (d - 130) * 0.01;
        a.vx += (dx / d) * k;
        a.vy += (dy / d) * k;
        b.vx -= (dx / d) * k;
        b.vy -= (dy / d) * k;
      });
      nodes.forEach((n) => {
        n.vx += (W / 2 - n.x) * 0.001;
        n.vy += (H / 2 - n.y) * 0.001;
        n.vx *= 0.82;
        n.vy *= 0.82;
        n.x += n.vx;
        n.y += n.vy;
      });
      tick((v) => v + 1);
      frames++;
      if (frames < 300) raf = requestAnimationFrame(run); // settle then stop
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [agents.length]);

  const nodes = nodesRef.current;
  const edges = edgesRef.current;

  if (isLoading && !data) {
    return (
      <div className="text-xs">
        <p className="text-dim mb-2">A2A topology — orchestrator drives builder / tester / reviewer.</p>
        <SkeletonGraph w={W} h={H} />
      </div>
    );
  }

  return (
    <div className="text-xs">
      <p className="text-dim mb-2">
        A2A topology — orchestrator drives builder / tester / reviewer.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-3xl border border-border rounded bg-bg">
        {edges.map((e, i) => {
          const a = nodes.find((n) => n.id === e.from);
          const b = nodes.find((n) => n.id === e.to);
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#30363d" strokeWidth={1} />;
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={6} fill="#58a6ff" />
            <text x={n.x + 9} y={n.y + 3} fill="#c9d1d9" fontSize={9}>
              {n.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
