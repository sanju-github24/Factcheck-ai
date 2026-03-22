import React, { useEffect, useRef, useState } from "react";

const VERDICT_COLORS = {
  true:             "#4ade80",
  false:            "#f87171",
  "partially true": "#fbbf24",
  unverifiable:     "#94a3b8",
};

function useForceGraph(nodes, edges, width, height) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    if (!nodes.length) return;

    // Initialize positions in a circle
    const pos = {};
    nodes.forEach((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2;
      const r     = Math.min(width, height) * 0.32;
      pos[n.id]   = {
        x:  width / 2 + Math.cos(angle) * r,
        y:  height / 2 + Math.sin(angle) * r,
        vx: 0, vy: 0,
      };
    });

    // Simple force simulation
    let frame;
    const simulate = () => {
      const k   = 0.04;
      const rep = 2800;

      // Repulsion between all nodes
      nodes.forEach(a => {
        nodes.forEach(b => {
          if (a.id === b.id) return;
          const dx = pos[a.id].x - pos[b.id].x;
          const dy = pos[a.id].y - pos[b.id].y;
          const d2 = dx*dx + dy*dy + 1;
          const f  = rep / d2;
          pos[a.id].vx += dx * f;
          pos[a.id].vy += dy * f;
        });
      });

      // Attraction along edges
      edges.forEach(e => {
        const a  = pos[e.source];
        const b  = pos[e.target];
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        a.vx += dx * k; a.vy += dy * k;
        b.vx -= dx * k; b.vy -= dy * k;
      });

      // Center gravity
      nodes.forEach(n => {
        pos[n.id].vx += (width/2  - pos[n.id].x) * 0.008;
        pos[n.id].vy += (height/2 - pos[n.id].y) * 0.008;
      });

      // Apply velocity with damping + bounds
      const pad = 40;
      nodes.forEach(n => {
        pos[n.id].vx *= 0.82;
        pos[n.id].vy *= 0.82;
        pos[n.id].x = Math.max(pad, Math.min(width - pad,  pos[n.id].x + pos[n.id].vx));
        pos[n.id].y = Math.max(pad, Math.min(height - pad, pos[n.id].y + pos[n.id].vy));
      });

      setPositions({ ...pos });
      frame = requestAnimationFrame(simulate);
    };

    // Run 60 frames then stop
    let count = 0;
    const run = () => {
      simulate();
      count++;
      if (count < 80) frame = requestAnimationFrame(run);
    };
    run();
    return () => cancelAnimationFrame(frame);
  }, [nodes.length, edges.length]);

  return positions;
}

export default function ClaimNetworkGraph({ graphData, onClaimClick }) {
  const [hovered, setHovered]   = useState(null);
  const [selected, setSelected] = useState(null);
  const W = 580, H = 320;

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  const positions = useForceGraph(nodes, edges, W, H);

  if (!nodes.length) return null;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)",
    }}>
      <div style={{ padding: "14px 20px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0, fontFamily: "'Syne',sans-serif" }}>
          Claim Network Graph
        </p>
        <p style={{ fontSize: 10, color: "rgba(200,210,240,0.4)", margin: 0, fontFamily: "'DM Mono',monospace" }}>
          Nodes = claims · Red edges = contradictions · Click to inspect
        </p>
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {/* Edges */}
        {edges.map((e, i) => {
          const a = positions[e.source];
          const b = positions[e.target];
          if (!a || !b) return null;
          return (
            <line key={i}
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={e.type === "contradiction" ? "rgba(248,113,113,0.6)" : "rgba(255,255,255,0.15)"}
              strokeWidth={e.type === "contradiction" ? 2 : 1}
              strokeDasharray={e.type === "contradiction" ? "4 3" : "none"}
            />
          );
        })}

        {/* Nodes */}
        {nodes.map(n => {
          const pos   = positions[n.id];
          if (!pos) return null;
          const color = VERDICT_COLORS[n.verdict] || "#94a3b8";
          const isHov = hovered === n.id;
          const isSel = selected === n.id;
          const r     = isHov || isSel ? 18 : 14;

          return (
            <g key={n.id}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { setSelected(isSel ? null : n.id); onClaimClick?.(n); }}
            >
              {/* Glow ring */}
              {(isHov || isSel) && (
                <circle cx={pos.x} cy={pos.y} r={r + 6}
                  fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.35}/>
              )}
              {/* Main circle */}
              <circle cx={pos.x} cy={pos.y} r={r}
                fill={`${color}22`} stroke={color}
                strokeWidth={isSel ? 2.5 : 1.5}/>
              {/* Label */}
              <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                style={{ fontSize: 11, fontWeight: 700, fill: color, fontFamily: "monospace", userSelect: "none" }}>
                {n.id}
              </text>
              {/* Hover tooltip */}
              {isHov && (
                <foreignObject x={pos.x + 20} y={pos.y - 30} width={180} height={60}>
                  <div style={{
                    background: "rgba(12,16,28,0.95)", border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 8, padding: "6px 9px", fontSize: 10,
                    color: "#e8eaf0", fontFamily: "Inter,sans-serif", lineHeight: 1.5,
                  }}>
                    <div style={{ color, fontWeight: 700, marginBottom: 2 }}>{n.verdict?.toUpperCase()}</div>
                    {n.claim}
                  </div>
                </foreignObject>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ padding: "8px 20px 14px", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(VERDICT_COLORS).map(([v, c]) => (
          <div key={v} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: c }}/>
            <span style={{ fontSize: 10, color: "rgba(200,210,240,0.55)", fontFamily: "'DM Mono',monospace" }}>
              {v}
            </span>
          </div>
        ))}
        {edges.some(e => e.type === "contradiction") && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 2, background: "rgba(248,113,113,0.7)", borderRadius: 1 }}/>
            <span style={{ fontSize: 10, color: "rgba(200,210,240,0.55)", fontFamily: "'DM Mono',monospace" }}>contradiction</span>
          </div>
        )}
      </div>
    </div>
  );
}
