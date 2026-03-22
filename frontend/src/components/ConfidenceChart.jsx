import React from "react";

const BARS = [
  { key: "trueClaims",         label: "True",          color: "#16a34a", bg: "#dcfce7" },
  { key: "falseClaims",        label: "False",         color: "#dc2626", bg: "#fee2e2" },
  { key: "partialClaims",      label: "Partial",       color: "#d97706", bg: "#fef3c7" },
  { key: "unverifiableClaims", label: "Unverifiable",  color: "#9ca3af", bg: "#f3f4f6" },
];

export default function ConfidenceChart({ report, claims }) {
  if (!report) return null;

  // Confidence distribution buckets: 0-25, 25-50, 50-75, 75-100
  const buckets = [0, 0, 0, 0];
  (claims || []).forEach(c => {
    const pct = (c.confidence || 0) * 100;
    if (pct < 25) buckets[0]++;
    else if (pct < 50) buckets[1]++;
    else if (pct < 75) buckets[2]++;
    else buckets[3]++;
  });
  const maxBucket = Math.max(...buckets, 1);

  return (
    <div style={{
      background: "#fff", border: "1px solid #e8e6e0",
      borderRadius: 16, padding: "20px 24px",
      display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24,
      animation: "slide-up 0.3s ease",
    }}>
      {/* Verdict distribution */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9b9990", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
          Verdict Distribution
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BARS.map(b => {
            const count = report[b.key] || 0;
            const pct   = report.totalClaims > 0 ? (count / report.totalClaims) * 100 : 0;
            return (
              <div key={b.key}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "#6b6a65", fontWeight: 500 }}>{b.label}</span>
                  <span style={{ color: b.color, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                    {count} · {Math.round(pct)}%
                  </span>
                </div>
                <div style={{ height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: b.color, borderRadius: 4,
                    transition: "width 0.9s cubic-bezier(.4,0,.2,1)",
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confidence histogram */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#9b9990", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>
          Confidence Distribution
        </p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 80 }}>
          {buckets.map((count, i) => {
            const labels = ["0–25%", "25–50%", "50–75%", "75–100%"];
            const colors = ["#f87171", "#fb923c", "#facc15", "#4ade80"];
            const h      = count > 0 ? Math.max((count / maxBucket) * 72, 8) : 4;
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#6b6a65", fontFamily: "var(--font-mono)" }}>
                  {count}
                </span>
                <div style={{
                  width: "100%", height: h, borderRadius: 4,
                  background: colors[i], transition: "height 0.8s ease",
                }} />
                <span style={{ fontSize: 9, color: "#9b9990", textAlign: "center" }}>{labels[i]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
