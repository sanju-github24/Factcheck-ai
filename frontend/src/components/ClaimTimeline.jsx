import React, { useState } from "react";
import TypewriterText from "./TypewriterText";

const VERDICT_COLORS = {
  true:             "#4ade80",
  false:            "#f87171",
  "partially true": "#fbbf24",
  unverifiable:     "#94a3b8",
};
const VERDICT_LABELS = { true:"True", false:"False", "partially true":"Partial", unverifiable:"Unknown" };

export default function ClaimTimeline({ claims }) {
  const [hovered, setHovered] = useState(null);
  if (!claims?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14, padding: "16px 20px", backdropFilter: "blur(12px)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 1, fontFamily: "'Syne',sans-serif" }}>Truth Profile</p>
          <p style={{ fontSize: 10, color: "rgba(200,210,240,0.7)", fontFamily: "'DM Mono',monospace" }}>Hover each segment</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {Object.entries(VERDICT_LABELS).map(([v, l]) => (
            <div key={v} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: VERDICT_COLORS[v] }}/>
              <span style={{ fontSize: 10, color: "rgba(200,210,240,0.7)", fontFamily: "'DM Mono',monospace" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", borderRadius: 7, overflow: "hidden", height: 24, gap: 2 }}>
        {claims.map((c, i) => (
          <div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{
            flex: 1, background: VERDICT_COLORS[c.verdict] || "#94a3b8", cursor: "pointer",
            opacity: hovered !== null && hovered !== i ? 0.35 : 1,
            transform: hovered === i ? "scaleY(1.1)" : "scaleY(1)",
            transition: "all 0.15s",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(0,0,0,0.6)", fontFamily: "'DM Mono',monospace" }}>{i+1}</span>
          </div>
        ))}
      </div>
      {hovered !== null && claims[hovered] && (
        <div style={{
          marginTop: 10, padding: "10px 14px",
          background: "rgba(255,255,255,0.05)", borderRadius: 9,
          borderLeft: `3px solid ${VERDICT_COLORS[claims[hovered].verdict]}`,
          animation: "fade-in 0.15s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
              background: VERDICT_COLORS[claims[hovered].verdict],
              color: "#000", letterSpacing: "0.06em", fontFamily: "'DM Mono',monospace",
            }}>{VERDICT_LABELS[claims[hovered].verdict]}</span>
            <span style={{ fontSize: 11, color: "rgba(200,210,240,0.7)", fontFamily: "'DM Mono',monospace" }}>
              {Math.round((claims[hovered].confidence || 0) * 100)}% confidence
            </span>
            {claims[hovered].time_sensitive && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)", fontFamily: "'DM Mono',monospace" }}>⏱ Time-sensitive</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: "#d8dce8", margin: 0, lineHeight: 1.5 }}>
            <TypewriterText key={hovered} text={claims[hovered].claim} speed={16} cursor={true}/>
          </p>
        </div>
      )}
    </div>
  );
}
