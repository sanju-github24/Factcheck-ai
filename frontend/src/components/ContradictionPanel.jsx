import React from "react";

export default function ContradictionPanel({ contradictions, claims }) {
  if (!contradictions?.length) return null;
  const getClaimText = id => claims?.find(c => c.id === id)?.claim || `Claim #${id}`;
  return (
    <div style={{
      background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)",
      borderRadius: 14, padding: "18px 20px", backdropFilter: "blur(12px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f87171", margin: 0, fontFamily: "'Syne',sans-serif" }}>
            Cross-Claim Contradictions
          </p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0, fontFamily: "'DM Mono',monospace" }}>
            {contradictions.length} found within this document
          </p>
        </div>
      </div>
      {contradictions.map((c, i) => (
        <div key={i} style={{ padding: "12px 14px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", fontFamily: "'DM Mono',monospace" }}>Claim {c.claim_id_a}</span>
            <span style={{ fontSize: 10, color: "#f87171" }}>↔</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 20, background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)", fontFamily: "'DM Mono',monospace" }}>Claim {c.claim_id_b}</span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontStyle: "italic", marginBottom: 6 }}>"{getClaimText(c.claim_id_a)}"</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontStyle: "italic", marginBottom: 8 }}>"{getClaimText(c.claim_id_b)}"</p>
          <p style={{ fontSize: 12, color: "#f87171", margin: 0, lineHeight: 1.5 }}>{c.explanation}</p>
        </div>
      ))}
    </div>
  );
}
