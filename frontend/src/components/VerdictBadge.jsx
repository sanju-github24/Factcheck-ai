import React from "react";

const MAP = {
  true:            { label: "True",           color: "var(--true-color)",    bg: "var(--true-bg)",    border: "var(--true-border)" },
  false:           { label: "False",          color: "var(--false-color)",   bg: "var(--false-bg)",   border: "var(--false-border)" },
  "partially true":{ label: "Partially True", color: "var(--partial-color)", bg: "var(--partial-bg)", border: "var(--partial-border)" },
  unverifiable:    { label: "Unverifiable",   color: "var(--unknown-color)", bg: "var(--unknown-bg)", border: "var(--unknown-border)" },
};

export default function VerdictBadge({ verdict, size = "sm" }) {
  const v = MAP[verdict] || MAP.unverifiable;
  const pad = size === "lg" ? "5px 14px" : "3px 10px";
  const fs  = size === "lg" ? 12 : 10;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: pad, borderRadius: 20,
      background: v.bg, color: v.color,
      border: `1px solid ${v.border}`,
      fontSize: fs, fontWeight: 600,
      letterSpacing: "0.05em", textTransform: "uppercase",
      fontFamily: "var(--font-body)", whiteSpace: "nowrap",
    }}>
      {v.label}
    </span>
  );
}
