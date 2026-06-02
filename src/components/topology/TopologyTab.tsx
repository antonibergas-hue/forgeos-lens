import { useEffect, useRef, useState, useMemo } from "react";
import { Maximize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useForgeos } from "../../hooks/useForgeos";
import { Agent, statusColor } from "../../lib/types";
import { SkeletonGraph } from "../core/Skeleton";

interface Node {
  id: string;
  name: string;
  status: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}
interface Edge {
  from: string;
  to: string;
}

const W = 800;
const H = 600;

// Topology tab: a force-directed graph of the A2A relationships.
// Now with zoom, pan, and interactive nodes (TODO: richer interactions).
export function TopologyTab({ onSelectAgent }: { onSelectAgent: (id: string) => void }) {
  const { data, isLoading } = useForgeos<Agent[]>({ args: ["list", "--json"] });
  const agents = data ?? [];
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [, tick] = useState(0);

  // Initialize nodes and edges
  useEffect(() => {
    if (agents.length === 0) return;

    // Keep existing node positions if possible to avoid jumps on refresh
    const existing = new Map(nodesRef.current.map((n) => [n.id, n]));
    
    nodesRef.current = agents.map((a, i) => {
      const old = existing.get(a.agent_id);
      if (old) return { ...old, status: a.status };
      
      return {
        id: a.agent_id,
        name: a.name,
        status: a.status,
        x: W / 2 + Math.cos((i / Math.max(agents.length, 1)) * 2 * Math.PI) * 150,
        y: H / 2 + Math.sin((i / Math.max(agents.length, 1)) * 2 * Math.PI) * 130,
        vx: 0,
        vy: 0,
      };
    });

    const orch = agents.find((a) => /orchestrator/i.test(a.name));
    const edges: Edge[] = [];
    if (orch) {
      agents
        .filter((a) => /builder|tester|reviewer|agent/i.test(a.name) && a.agent_id !== orch.agent_id)
        .forEach((t) => edges.push({ from: orch.agent_id, to: t.agent_id }));
    }
    // Also look for explicit relationships in metadata if available in future
    edgesRef.current = edges;
  }, [agents]);

  // Force simulation loop
  useEffect(() => {
    let raf = 0;
    const run = () => {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy) || 1;
          const rep = 3000 / (d * d);
          a.vx += (dx / d) * rep;
          a.vy += (dy / d) * rep;
          b.vx -= (dx / d) * rep;
          b.vy -= (dy / d) * rep;
        }
      }

      // Spring force along edges
      edges.forEach((e) => {
        const a = nodes.find((n) => n.id === e.from);
        const b = nodes.find((n) => n.id === e.to);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1;
        const k = (d - 160) * 0.02;
        a.vx += (dx / d) * k;
        a.vy += (dy / d) * k;
        b.vx -= (dx / d) * k;
        b.vy -= (dy / d) * k;
      });

      // Gravity to center + friction
      nodes.forEach((n) => {
        n.vx += (W / 2 - n.x) * 0.005;
        n.vy += (H / 2 - n.y) * 0.005;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
      });

      tick((v) => v + 1);
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newK = Math.min(Math.max(transform.k * scaleFactor, 0.2), 5);
    
    // Zoom towards cursor
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const wx = (mx - transform.x) / transform.k;
    const wy = (my - transform.y) / transform.k;
    
    setTransform({
      x: mx - wx * newK,
      y: my - wy * newK,
      k: newK,
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTransform((t) => ({
      ...t,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetTransform = () => setTransform({ x: 0, y: 0, k: 1 });

  const nodes = nodesRef.current;
  const edges = edgesRef.current;

  if (isLoading && agents.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2 shrink-0">
          <p className="text-dim">A2A topology — orchestrator drives builder / tester / reviewer.</p>
        </div>
        <div className="flex-1 min-h-[400px]">
          <SkeletonGraph w={W} h={H} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-xs font-mono">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <p className="text-dim">
          A2A topology — orchestrator drives children. Use wheel to zoom, drag to pan.
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTransform((t) => ({ ...t, k: t.k * 1.2 }))}
            className="p-1 hover:bg-surface border border-border rounded text-dim hover:text-text"
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setTransform((t) => ({ ...t, k: t.k / 1.2 }))}
            className="p-1 hover:bg-surface border border-border rounded text-dim hover:text-text"
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={resetTransform}
            className="p-1 hover:bg-surface border border-border rounded text-dim hover:text-text"
            title="Reset View"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 border border-border rounded bg-bg relative overflow-hidden cursor-grab active:cursor-grabbing">
        <svg
          className="w-full h-full"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="15"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#30363d" />
            </marker>
          </defs>
          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#30363d"
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            {nodes.map((n) => {
              const color = statusColor(n.status).replace("bg-", "");
              const isRunning = n.status.toLowerCase() === "running";
              
              return (
                <g
                  key={n.id}
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectAgent(n.id);
                  }}
                >
                  {isRunning && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={10}
                      className="animate-ping opacity-20"
                      fill={`var(--${color === 'info' ? 'blue' : color === 'ok' ? 'green' : color})`}
                      style={{ fill: color === 'info' ? '#58a6ff' : color === 'ok' ? '#3fb950' : '#8b949e' }}
                    />
                  )}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={7}
                    className={`transition-transform group-hover:scale-125`}
                    style={{ fill: color === 'info' ? '#58a6ff' : color === 'ok' ? '#3fb950' : color === 'danger' ? '#f85149' : '#8b949e' }}
                  />
                  <text
                    x={n.x}
                    y={n.y + 18}
                    textAnchor="middle"
                    fill="#c9d1d9"
                    className="text-[10px] pointer-events-none select-none drop-shadow-sm font-semibold"
                  >
                    {n.name}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 28}
                    textAnchor="middle"
                    fill="#8b949e"
                    className="text-[8px] pointer-events-none select-none opacity-0 group-hover:opacity-100 transition-opacity uppercase"
                  >
                    {n.status}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 right-3 p-2 bg-surface/80 border border-border rounded text-[10px] space-y-1 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ok" />
            <span className="text-dim">Idle/Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-info" />
            <span className="text-dim">Running</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span className="text-dim">Failed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
