import React, { useState } from "react";

export default function AIDetectionPanel({ aiScore }) {
  const [expanded, setExpanded] = useState(false);
  if (!aiScore) return null;

  const prob      = aiScore.ai_probability ?? 0.35;
  const pct       = Math.round(prob * 100);
  const isAI      = prob > 0.6;
  const isUnsure  = prob >= 0.4 && prob <= 0.6;
  const color     = isAI ? "var(--false-color)"  : isUnsure ? "var(--partial-color)" : "var(--true-color)";
  const bg        = isAI ? "var(--false-bg)"     : isUnsure ? "var(--partial-bg)"    : "var(--true-bg)";
  const border    = isAI ? "var(--false-border)" : isUnsure ? "var(--partial-border)": "var(--true-border)";
  const mainLabel = isAI ? "AI Written"          : isUnsure ? "Uncertain"            : "Human Written";

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, overflow: "hidden", animation: "slide-up 0.35s ease",
    }}>
      {/* Main row — always visible */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>
            Content Origin
          </span>
          <span style={{
            padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: bg, border: `1px solid ${border}`, color,
          }}>
            {mainLabel}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {pct}% AI
          </span>
        </div>

        <button onClick={() => setExpanded(e => !e)} style={{
          fontSize: 11, color: "var(--text-muted)", background: "none",
          border: "1px solid var(--border)", borderRadius: 6,
          padding: "4px 10px", cursor: "pointer", fontFamily: "var(--font-body)",
          display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
        }}>
          {expanded ? "Less" : "More info"}
          <span style={{
            display: "inline-block", transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "none", fontSize: 10,
          }}>▾</span>
        </button>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div style={{
          borderTop: "1px solid var(--border)", padding: "16px 20px",
          background: "var(--surface-2)", animation: "slide-up 0.2s ease",
        }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between",
                          fontSize: 10, color: "var(--text-muted)", marginBottom: 5 }}>
              <span>Human</span><span>AI</span>
            </div>
            <div style={{ height: 7, background: "var(--border)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%", background: color, borderRadius: 4,
                transition: "width 0.8s ease",
              }} />
            </div>
          </div>

          {aiScore.reasoning && (
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
              {aiScore.reasoning}
            </p>
          )}

          {aiScore.signals?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {aiScore.signals.map((s, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: "3px 9px",
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: 20, color: "var(--text-muted)",
                }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
