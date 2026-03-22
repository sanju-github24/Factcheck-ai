import React from "react";

function AccuracyRing({ value }) {
  const size = 110;
  const r    = 44;
  const circ = 2 * Math.PI * r;
  const pct  = Math.max(0, Math.min(1, isNaN(value) ? 0 : value));
  const arc  = circ * pct;
  const color = pct > 0.7 ? "var(--true-color)" : pct > 0.4 ? "var(--partial-color)" : "var(--false-color)";
  const grade = pct > 0.8 ? "High" : pct > 0.5 ? "Mixed" : "Low";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={8}
            strokeDasharray={`${circ} ${circ}`} strokeDashoffset={0}
            transform={`rotate(-90 ${size/2} ${size/2})`}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={`${arc} ${circ}`} strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}/>
        </svg>
        {/* Text as absolute overlay — never inside rotated SVG */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "var(--font-display)", lineHeight: 1 }}>
            {Math.round(pct * 100)}%
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>{grade}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8, letterSpacing: "0.04em" }}>
        ACCURACY
      </span>
    </div>
  );
}

function VerdictBar({ count, total, label, color, bg, border }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 11, padding: "1px 8px", borderRadius: 20,
            background: bg, border: `1px solid ${border}`, color,
            fontWeight: 700, fontFamily: "var(--font-mono)",
          }}>{count}</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 28, textAlign: "right", fontFamily: "var(--font-mono)" }}>
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <div style={{ height: 5, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--border)" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.9s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );
}

export default function SummaryCards({ report }) {
  const { overallAccuracy, totalClaims, trueClaims, falseClaims, partialClaims, unverifiableClaims } = report;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, padding: "22px 24px", animation: "slide-up 0.3s ease",
      display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap",
    }}>
      <AccuracyRing value={overallAccuracy} />
      <div style={{ width: 1, height: 100, background: "var(--border)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 200 }}>
        <VerdictBar count={trueClaims}         total={totalClaims} label="True"           color="var(--true-color)"    bg="var(--true-bg)"    border="var(--true-border)" />
        <VerdictBar count={falseClaims}        total={totalClaims} label="False"          color="var(--false-color)"   bg="var(--false-bg)"   border="var(--false-border)" />
        <VerdictBar count={partialClaims}      total={totalClaims} label="Partially True" color="var(--partial-color)" bg="var(--partial-bg)" border="var(--partial-border)" />
        <VerdictBar count={unverifiableClaims} total={totalClaims} label="Unverifiable"   color="var(--unknown-color)" bg="var(--unknown-bg)" border="var(--unknown-border)" />
      </div>
      <div style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 20, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
        {totalClaims} claims
      </div>
    </div>
  );
}
