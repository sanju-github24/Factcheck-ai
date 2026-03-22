import React, { useState } from "react";

const SEVERITY_COLORS = {
  high:   { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.25)", flames: "🔥🔥🔥" },
  medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.25)",  flames: "🔥🔥" },
  low:    { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)",  flames: "🔥" },
};

export default function MisinfoPatternPanel({ misinoResult }) {
  const [expanded, setExpanded] = useState(false);
  if (!misinoResult) return null;

  const score      = misinoResult.overall_manipulation_score ?? 0;
  const pct        = Math.round(score * 100);
  const techniques = misinoResult.techniques_found || [];
  const isClean    = techniques.length === 0;
  const color      = score > 0.6 ? "#f87171" : score > 0.3 ? "#fbbf24" : "#4ade80";
  const label      = score > 0.6 ? "High Manipulation" : score > 0.3 ? "Some Manipulation" : "Clean Content";

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: `1px solid ${isClean ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)",
    }}>
      {/* Collapsed row */}
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          fontSize: 20, width: 36, height: 36, borderRadius: 10,
          background: `${color}15`, border: `1px solid ${color}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {isClean ? "✓" : "⚡"}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0, fontFamily: "'Syne',sans-serif" }}>
              Manipulation Analysis
            </p>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
              background: `${color}15`, border: `1px solid ${color}40`, color,
              fontFamily: "'DM Mono',monospace",
            }}>{label}</span>
            {techniques.length > 0 && (
              <span style={{ fontSize: 11, color: "rgba(200,210,240,0.5)" }}>
                {techniques.length} technique{techniques.length > 1 ? "s" : ""} detected
              </span>
            )}
          </div>

          {/* Mini bar */}
          <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", maxWidth: 200 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.9s ease" }}/>
          </div>
        </div>

        {!isClean && (
          <button onClick={() => setExpanded(e => !e)} style={{
            fontSize: 11, color: "rgba(200,210,240,0.4)", background: "none",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
            padding: "4px 10px", cursor: "pointer", flexShrink: 0,
          }}>
            {expanded ? "Less ▴" : "Details ▾"}
          </button>
        )}
      </div>

      {/* Technique cards */}
      {expanded && techniques.length > 0 && (
        <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {techniques.map((t, i) => {
              const s = SEVERITY_COLORS[t.severity] || SEVERITY_COLORS.low;
              return (
                <div key={i} style={{
                  padding: "12px 14px", borderRadius: 10,
                  background: s.bg, border: `1px solid ${s.border}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12 }}>{s.flames}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color, textTransform: "capitalize" }}>
                      {t.technique}
                    </span>
                    <span style={{
                      fontSize: 9, padding: "1px 7px", borderRadius: 20,
                      background: `${s.color}20`, border: `1px solid ${s.color}40`,
                      color: s.color, fontFamily: "'DM Mono',monospace", marginLeft: "auto",
                    }}>{t.severity?.toUpperCase()}</span>
                  </div>
                  {t.evidence && (
                    <p style={{ fontSize: 11, color: "rgba(200,210,240,0.6)", fontStyle: "italic", margin: "0 0 5px", lineHeight: 1.5 }}>
                      "{t.evidence}"
                    </p>
                  )}
                  <p style={{ fontSize: 11, color: "rgba(200,210,240,0.75)", margin: 0, lineHeight: 1.5 }}>
                    {t.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Media literacy tip */}
          {misinoResult.media_literacy_tip && (
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.2)",
            }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#93c5fd", marginBottom: 4, letterSpacing: "0.06em" }}>
                💡 MEDIA LITERACY TIP
              </p>
              <p style={{ fontSize: 12, color: "#bfdbfe", margin: 0, lineHeight: 1.6 }}>
                {misinoResult.media_literacy_tip}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
