import React, { useState } from "react";

const LEANING_COLORS = {
  "left":         "#3b82f6",
  "center-left":  "#60a5fa",
  "center":       "#16a34a",
  "center-right": "#fb923c",
  "right":        "#dc2626",
  "none":         "#9ca3af",
};

const LEANING_POS = {
  "left": 5, "center-left": 25, "center": 50, "center-right": 75, "right": 95, "none": 50,
};

const TYPE_LABELS = {
  political: "Political", commercial: "Commercial",
  ideological: "Ideological", sensationalist: "Sensationalist", none: "None detected",
};

export default function BiasPanel({ biasResult }) {
  const [expanded, setExpanded] = useState(false);
  if (!biasResult) return null;

  const score     = biasResult.bias_score ?? 0;
  const pct       = Math.round(score * 100);
  const leaning   = biasResult.political_leaning || "center";
  const leanColor = LEANING_COLORS[leaning] || "#9ca3af";
  const leanPos   = LEANING_POS[leaning] ?? 50;
  const isNone    = score < 0.15;

  const biasColor = score > 0.6 ? "#dc2626" : score > 0.35 ? "#d97706" : "#16a34a";
  const biasLabel = score > 0.6 ? "High Bias" : score > 0.35 ? "Moderate Bias" : "Low Bias";

  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e6e0",
      borderRadius: 16, overflow: "hidden", animation: "slide-up 0.35s ease",
    }}>
      {/* Collapsed row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#9b9990",
            textTransform: "uppercase", letterSpacing: "0.07em",
          }}>Bias Detection</span>

          <span style={{
            padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: isNone ? "#f0fdf4" : "#fff7ed",
            border: `1px solid ${isNone ? "#bbf7d0" : "#fed7aa"}`,
            color: biasColor,
          }}>{biasLabel}</span>

          {!isNone && (
            <span style={{
              fontSize: 11, color: "#9b9990", fontFamily: "var(--font-mono)",
            }}>
              {TYPE_LABELS[biasResult.bias_type] || "Unknown"} · {leaning !== "none" ? leaning : "neutral"}
            </span>
          )}
          <span style={{ fontSize: 11, color: "#9b9990", fontFamily: "var(--font-mono)" }}>
            {pct}% bias intensity
          </span>
        </div>

        <button onClick={() => setExpanded(e => !e)} style={{
          fontSize: 11, color: "#9b9990", background: "none",
          border: "1px solid #e8e6e0", borderRadius: 6,
          padding: "4px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
        }}>
          {expanded ? "Less" : "More info"}
          <span style={{ display: "inline-block", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none", fontSize: 10 }}>▾</span>
        </button>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{
          borderTop: "1px solid #e8e6e0", padding: "16px 20px",
          background: "#f9f8f5", animation: "slide-up 0.2s ease",
        }}>
          {/* Intensity bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#9b9990", marginBottom: 5 }}>
              <span>Neutral</span><span>Highly biased</span>
            </div>
            <div style={{ height: 7, background: "#e8e6e0", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%", background: biasColor,
                borderRadius: 4, transition: "width 0.8s ease",
              }} />
            </div>
          </div>

          {/* Political spectrum */}
          {leaning !== "none" && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#9b9990", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Political Leaning
              </p>
              <div style={{ position: "relative", height: 20 }}>
                {/* Spectrum bar */}
                <div style={{
                  position: "absolute", top: 8, left: 0, right: 0, height: 4,
                  borderRadius: 2,
                  background: "linear-gradient(to right, #3b82f6, #60a5fa, #16a34a, #fb923c, #dc2626)",
                }} />
                {/* Labels */}
                {["Left","Center","Right"].map((l, i) => (
                  <span key={l} style={{
                    position: "absolute", top: 0, fontSize: 9, color: "#9b9990",
                    left: i === 0 ? 0 : i === 1 ? "50%" : undefined,
                    right: i === 2 ? 0 : undefined,
                    transform: i === 1 ? "translateX(-50%)" : "none",
                  }}>{l}</span>
                ))}
                {/* Marker */}
                <div style={{
                  position: "absolute", top: 4, width: 12, height: 12, borderRadius: "50%",
                  background: leanColor, border: "2px solid #fff",
                  left: `${leanPos}%`, transform: "translateX(-50%)",
                  boxShadow: `0 0 8px ${leanColor}66`,
                  transition: "left 0.6s ease",
                }} />
              </div>
            </div>
          )}

          {/* Summary */}
          {biasResult.summary && (
            <p style={{ fontSize: 12, color: "#6b6a65", lineHeight: 1.6, marginBottom: 10 }}>
              {biasResult.summary}
            </p>
          )}

          {/* Signals */}
          {biasResult.signals?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {biasResult.signals.map((s, i) => (
                <span key={i} style={{
                  fontSize: 10, padding: "3px 9px",
                  background: "#fff", border: "1px solid #e8e6e0",
                  borderRadius: 20, color: "#6b6a65",
                }}>{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
