import React, { useState, useEffect } from "react";

const VERDICT_COLORS = {
  true:             "#4ade80",
  false:            "#f87171",
  "partially true": "#fbbf24",
  unverifiable:     "#94a3b8",
};

function AccuracyMini({ value }) {
  const pct   = Math.round((value ?? 0) * 100);
  const color = value > 0.7 ? "#4ade80" : value > 0.4 ? "#fbbf24" : "#f87171";
  const r = 14, circ = 2 * Math.PI * r;
  const arc = circ * (value ?? 0);
  return (
    <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
      <svg width="36" height="36">
        <circle cx="18" cy="18" r={r} fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth={3}
          strokeDasharray={`${circ} ${circ}`}
          transform="rotate(-90 18 18)" />
        <circle cx="18" cy="18" r={r} fill="none"
          stroke={color} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={`${arc} ${circ}`}
          transform="rotate(-90 18 18)"
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800, color,
        fontFamily: "'Syne',sans-serif",
      }}>{pct}%</div>
    </div>
  );
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m    = Math.floor(diff / 60000);
  const h    = Math.floor(diff / 3600000);
  const d    = Math.floor(diff / 86400000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export default function RecentChecks({ onRestore }) {
  const [history, setHistory] = useState([]);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("fc_history") || "[]");
      setHistory(saved);
    } catch (_) {}
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("fc_history");
    setHistory([]);
  };

  if (!history.length) return null;

  return (
    <div style={{ width: "100%", maxWidth: 660, marginTop: 20 }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(200,210,240,0.4)" }} />
          <span style={{
            fontSize: 10, color: "rgba(200,210,240,0.45)",
            fontFamily: "'DM Mono',monospace", letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}>Recent checks</span>
        </div>
        <button onClick={clearHistory} style={{
          fontSize: 10, color: "rgba(200,210,240,0.25)",
          background: "none", border: "none", cursor: "pointer",
          fontFamily: "'DM Mono',monospace",
          transition: "color 0.15s",
        }}
        onMouseEnter={e => e.target.style.color = "rgba(248,113,113,0.7)"}
        onMouseLeave={e => e.target.style.color = "rgba(200,210,240,0.25)"}
        >clear all</button>
      </div>

      {/* History cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {history.map((item, i) => {
          const isHov = hoveredIdx === i;
          return (
            <button
              key={i}
              onClick={() => onRestore?.(item)}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                background: isHov ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${isHov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)"}`,
                backdropFilter: "blur(8px)",
                transition: "all 0.15s", textAlign: "left",
                width: "100%",
              }}
            >
              {/* Accuracy ring */}
              <AccuracyMini value={item.accuracy ?? 0} />

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: 12, fontWeight: 500,
                  color: isHov ? "#fff" : "rgba(220,228,248,0.75)",
                  fontFamily: "'Inter',sans-serif",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  transition: "color 0.15s",
                }}>{item.text}{item.text?.length >= 80 ? "…" : ""}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                  <span style={{
                    fontSize: 10, color: "rgba(200,210,240,0.35)",
                    fontFamily: "'DM Mono',monospace",
                  }}>{item.claims} claims · {timeAgo(item.ts)}</span>

                  {/* Mini verdict dots */}
                  {item.verdicts && (
                    <div style={{ display: "flex", gap: 3 }}>
                      {item.verdicts.map((v, j) => (
                        <div key={j} style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: VERDICT_COLORS[v] || "#94a3b8",
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Restore arrow */}
              <span style={{
                fontSize: 14, color: isHov ? "rgba(200,210,240,0.7)" : "rgba(200,210,240,0.2)",
                transition: "all 0.15s",
                transform: isHov ? "translateX(2px)" : "none",
              }}>→</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
