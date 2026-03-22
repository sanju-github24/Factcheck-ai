import React, { useState } from "react";

function ImageCard({ img }) {
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isAI    = img.ai_generated === true;
  const isReal  = img.ai_generated === false;
  const noHive  = !img.available;
  const aiProb  = img.ai_probability ?? 0;

  // Show meaningful percentage — Real% for real photos, AI% for AI images
  const displayPct = isAI
    ? Math.round(aiProb * 100)
    : Math.round((1 - aiProb) * 100);

  const color  = isAI ? "#f87171" : isReal ? "#4ade80" : "#94a3b8";
  const label  = isAI ? "AI Generated" : isReal ? "Likely Real" : noHive ? "Detection N/A" : "Unknown";
  const pct    = img.ai_probability != null ? displayPct : null;
  const suffix = isAI ? "AI" : "Real";
  const dfPct  = img.deepfake_probability != null ? Math.round(img.deepfake_probability * 100) : null;

  return (
    <div style={{
      borderRadius: 12, overflow: "hidden",
      border: `1px solid ${isAI ? "rgba(248,113,113,0.35)" : isReal ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.1)"}`,
      background: "rgba(255,255,255,0.03)",
      transition: "border-color 0.2s",
    }}>
      {/* Image */}
      <div style={{ position: "relative", aspectRatio: "16/9", background: "rgba(255,255,255,0.04)" }}>
        {!failed ? (
          <img
            src={img.url} alt=""
            onError={() => setFailed(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono',monospace" }}>Image unavailable</span>
          </div>
        )}

        {/* Badge — solid colored bar, unmissable */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          background: isAI ? "rgba(255,40,40,0.92)" : noHive ? "rgba(60,60,80,0.85)" : "rgba(0,180,80,0.92)",
          backdropFilter: "blur(4px)",
          padding: "7px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderRadius: "0 0 10px 10px",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ fontSize:13 }}>{isAI ? "🤖" : noHive ? "❓" : "📷"}</span>
            <span style={{ fontSize:11, fontWeight:800, color:"#fff", fontFamily:"'DM Mono',monospace", letterSpacing:"0.05em" }}>
              {noHive ? "DETECTION N/A" : isAI ? "AI GENERATED" : "REAL PHOTO"}
            </span>
          </div>
          {pct != null && (
            <span style={{ fontSize:15, fontWeight:900, color:"#fff", fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em" }}>
              {pct}% {!noHive ? suffix : ""}
            </span>
          )}
        </div>
      </div>

      {/* Details row */}
      {img.available && (
        <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {pct != null && (
              <div>
                <p style={{ fontSize: 9, color: "rgba(200,210,240,0.35)", fontFamily: "'DM Mono',monospace", margin: "0 0 2px" }}>AI PROB</p>
                <div style={{ height: 4, width: 80, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3 }}/>
                </div>
              </div>
            )}
            {dfPct != null && (
              <div>
                <p style={{ fontSize: 9, color: "rgba(200,210,240,0.35)", fontFamily: "'DM Mono',monospace", margin: "0 0 2px" }}>DEEPFAKE</p>
                <div style={{ height: 4, width: 80, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${dfPct}%`, height: "100%", background: "#f87171", borderRadius: 3 }}/>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MediaAnalysisPanel({ articleMedia }) {
  const [expanded, setExpanded] = useState(true);
  if (!articleMedia?.available) return null;

  const images  = articleMedia.images || [];
  const summary = articleMedia.summary || {};

  if (!images.length) return null;

  const hasHive   = images.some(img => img.available);
  const aiCount   = summary.ai_count  || 0;
  const realCount = summary.real_count || 0;
  const total     = summary.total      || images.length;

  const overallColor = aiCount > realCount ? "#f87171" : aiCount === 0 ? "#4ade80" : "#fbbf24";
  const overallLabel = aiCount === 0
    ? "All images appear real"
    : aiCount === total
    ? "All images appear AI-generated"
    : `${aiCount} of ${total} images appear AI-generated`;

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${aiCount > 0 ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: 16, overflow: "hidden", backdropFilter: "blur(12px)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 20px",
        borderBottom: expanded ? "1px solid rgba(255,255,255,0.07)" : "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 14 }}>🖼</span>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0, fontFamily: "'Syne',sans-serif" }}>
              Article Media Detection
            </p>
          </div>

          <span style={{
            fontSize: 10, padding: "2px 9px", borderRadius: 20, fontWeight: 700,
            background: `${overallColor}15`,
            border: `1px solid ${overallColor}40`,
            color: overallColor,
            fontFamily: "'DM Mono',monospace",
          }}>{overallLabel}</span>

          {!hasHive && (
            <span style={{
              fontSize: 10, padding: "2px 9px", borderRadius: 20,
              background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)",
              color: "#fbbf24", fontFamily: "'DM Mono',monospace",
            }}>⚠ Add SIGHTENGINE_USER/SECRET for AI detection</span>
          )}

          {/* Stats pills */}
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontFamily: "'DM Mono',monospace" }}>
              ✓ {realCount} real
            </span>
            {aiCount > 0 && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", fontFamily: "'DM Mono',monospace" }}>
                ⚠ {aiCount} AI
              </span>
            )}
          </div>
        </div>

        <button onClick={() => setExpanded(e => !e)} style={{
          fontSize: 11, color: "rgba(200,210,240,0.4)", background: "none",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
          padding: "4px 10px", cursor: "pointer", flexShrink: 0,
        }}>{expanded ? "Hide ▴" : "Show ▾"}</button>
      </div>

      {/* Image grid */}
      {expanded && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, 1fr)`,
            gap: 10,
          }}>
            {images.map((img, i) => <ImageCard key={i} img={img} />)}
          </div>

          <p style={{ fontSize: 10, color: "rgba(200,210,240,0.3)", marginTop: 12, fontFamily: "'DM Mono',monospace" }}>
            Images scraped directly from article · Analyzed by Hive Moderation API
          </p>
        </div>
      )}
    </div>
  );
}