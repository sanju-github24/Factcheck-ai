import React, { useState } from "react";

const METRICS = [
  { key: "writing_quality",   label: "Writing Quality"   },
  { key: "citation_score",    label: "Citations"         },
  { key: "emotional_score",   label: "Emotional Balance" },
  { key: "balance_score",     label: "Balanced View"     },
  { key: "specificity_score", label: "Specificity"       },
  { key: "transparency_score",label: "Transparency"      },
];

function GradeRing({ grade, score }) {
  const color = score >= 80 ? "#4ade80" : score >= 65 ? "#fbbf24" : score >= 50 ? "#fb923c" : "#f87171";
  return (
    <div style={{
      width: 64, height: 64, borderRadius: "50%",
      background: `${color}15`, border: `2px solid ${color}50`,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>{grade}</span>
      <span style={{ fontSize: 9, color: `${color}90`, fontFamily: "'DM Mono',monospace" }}>{score}</span>
    </div>
  );
}

export default function SourceTrustPanel({ trustResult, wayback }) {
  const [expanded, setExpanded] = useState(false);
  if (!trustResult) return null;

  const score = trustResult.trust_score ?? 60;
  const color = score >= 80 ? "#4ade80" : score >= 65 ? "#fbbf24" : score >= 50 ? "#fb923c" : "#f87171";
  const label = score >= 80 ? "Trustworthy" : score >= 65 ? "Generally Reliable" : score >= 50 ? "Use With Caution" : "Low Trust";

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)",
    }}>
      {/* Main row */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <GradeRing grade={trustResult.grade || "?"} score={score} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0, fontFamily: "'Syne',sans-serif" }}>
              Source Trust Score
            </p>
            <span style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
              background: `${color}18`, border: `1px solid ${color}40`, color,
              fontFamily: "'DM Mono',monospace",
            }}>{label}</span>
            {wayback?.available && (
              <a href={wayback.wayback_url} target="_blank" rel="noopener noreferrer" style={{
                fontSize: 10, padding: "2px 8px", borderRadius: 20,
                background: "rgba(99,179,237,0.1)", border: "1px solid rgba(99,179,237,0.3)",
                color: "#93c5fd", textDecoration: "none", fontFamily: "'DM Mono',monospace",
              }}>📦 Wayback</a>
            )}
          </div>
          <p style={{ fontSize: 12, color: "rgba(200,210,240,0.7)", margin: 0 }}>
            {trustResult.summary}
          </p>
        </div>

        {/* Domain score */}
        {trustResult.domain_score && (
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: trustResult.domain_color || "#94a3b8", fontFamily: "'Syne',sans-serif" }}>
              {trustResult.domain_score}
            </div>
            <div style={{ fontSize: 9, color: "rgba(200,210,240,0.45)", fontFamily: "'DM Mono',monospace" }}>DOMAIN</div>
          </div>
        )}

        <button onClick={() => setExpanded(e => !e)} style={{
          fontSize: 11, color: "rgba(200,210,240,0.4)", background: "none",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
          padding: "4px 10px", cursor: "pointer", flexShrink: 0,
        }}>
          {expanded ? "Less ▴" : "More ▾"}
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: "0 20px 18px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          {/* Metric bars */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", marginBottom: 14 }}>
            {METRICS.map(m => {
              const val   = trustResult[m.key] ?? 50;
              const mcol  = val >= 75 ? "#4ade80" : val >= 55 ? "#fbbf24" : "#f87171";
              return (
                <div key={m.key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: "rgba(200,210,240,0.65)" }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: mcol, fontFamily: "'DM Mono',monospace", fontWeight: 700 }}>{val}</span>
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${val}%`, height: "100%", background: mcol, borderRadius: 3, transition: "width 0.8s ease" }}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Red/Green flags */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {trustResult.red_flags?.length > 0 && (
              <div style={{ padding: "10px 12px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>⚠ Red Flags</p>
                {trustResult.red_flags.map((f, i) => (
                  <p key={i} style={{ fontSize: 11, color: "#fca5a5", margin: "0 0 4px" }}>• {f}</p>
                ))}
              </div>
            )}
            {trustResult.green_flags?.length > 0 && (
              <div style={{ padding: "10px 12px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>✓ Green Flags</p>
                {trustResult.green_flags.map((f, i) => (
                  <p key={i} style={{ fontSize: 11, color: "#86efac", margin: "0 0 4px" }}>• {f}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
