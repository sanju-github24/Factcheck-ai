import React, { useState } from "react";
import TypewriterText, { TypewriterBlock } from "./TypewriterText";

const VC = {
  true:             { color:"#4ade80", bg:"rgba(74,222,128,0.08)",  border:"rgba(74,222,128,0.25)",  text:"#4ade80" },
  false:            { color:"#f87171", bg:"rgba(248,113,113,0.08)", border:"rgba(248,113,113,0.25)", text:"#f87171" },
  "partially true": { color:"#fbbf24", bg:"rgba(251,191,36,0.08)",  border:"rgba(251,191,36,0.25)",  text:"#fbbf24" },
  unverifiable:     { color:"#94a3b8", bg:"rgba(148,163,184,0.08)", border:"rgba(148,163,184,0.2)",  text:"#94a3b8" },
};
const VL = { true:"TRUE", false:"FALSE", "partially true":"PARTIAL", unverifiable:"UNKNOWN" };

function ConfBar({ value }) {
  const pct   = Math.round((value ?? 0) * 100);
  const color = value > 0.7 ? "#4ade80" : value > 0.4 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:3, transition:"width 0.8s ease" }}/>
      </div>
      <span style={{ fontSize:11, color, fontWeight:700, fontFamily:"'DM Mono',monospace", minWidth:30 }}>{pct}%</span>
    </div>
  );
}

function CredBadge({ score, label, color }) {
  if (!score) return null;
  return (
    <span style={{
      fontSize:10, padding:"2px 8px", borderRadius:20, fontFamily:"'DM Mono',monospace",
      background:`${color}15`, border:`1px solid ${color}44`, color, fontWeight:600,
    }}>{score} · {label}</span>
  );
}

function ImageAIBadge({ analysis }) {
  if (!analysis?.available) return null;
  const isAI   = analysis.ai_generated;
  const aiProb = analysis.ai_probability ?? 0;

  // Show AI% when AI, show Real% (inverse) when real
  const displayPct = isAI
    ? Math.round(aiProb * 100)           // e.g. 94% AI
    : Math.round((1 - aiProb) * 100);   // e.g. 99% Real

  const bg    = isAI ? "rgba(220,30,30,0.92)" : "rgba(0,160,70,0.92)";
  const icon  = isAI ? "🤖" : "📷";
  const label = isAI ? "AI GENERATED" : "REAL PHOTO";
  const suffix = isAI ? "AI" : "Real";

  return (
    <div style={{
      position:"absolute", bottom:0, left:0, right:0,
      background: bg, backdropFilter:"blur(4px)",
      padding:"7px 12px", borderRadius:"0 0 9px 9px",
      display:"flex", alignItems:"center", justifyContent:"space-between",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:13 }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:800, color:"#fff", fontFamily:"'DM Mono',monospace", letterSpacing:"0.06em" }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize:15, fontWeight:900, color:"#fff", fontFamily:"'Syne',sans-serif" }}>
        {displayPct}% {suffix}
      </span>
    </div>
  );
}

function ImageGallery({ images, imageAnalysis, borderColor }) {
  const [failed, setFailed] = useState({});
  const [active, setActive] = useState(null);
  const visible = images.filter((_,i) => !failed[i]);
  if (!visible.length) return null;
  return (
    <div style={{ marginTop:14 }}>
      {/* Lightbox — inline in document flow, not fixed, so it works at any scroll position */}
      {active !== null && (
        <div style={{
          minHeight: 320, background:"rgba(0,0,0,0.88)", borderRadius:12,
          display:"flex", alignItems:"center", justifyContent:"center",
          position:"relative", marginBottom:10, cursor:"zoom-out",
        }} onClick={() => setActive(null)}>
          <img src={images[active]} alt="" onClick={e=>e.stopPropagation()} style={{
            maxWidth:"100%", maxHeight:420, borderRadius:10, objectFit:"contain", display:"block",
          }}/>
          <button onClick={() => setActive(null)} style={{
            position:"absolute", top:10, right:10,
            background:"rgba(255,255,255,0.15)", border:"none",
            borderRadius:"50%", width:32, height:32,
            color:"#fff", fontSize:16, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>✕</button>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(visible.length,3)},1fr)`, gap:8 }}>
        {images.slice(0,3).map((src,i) => failed[i] ? null : (
          <div key={i}
            onClick={() => setActive(active === i ? null : i)}
            style={{
              position:"relative", borderRadius:10,
              overflow:"hidden",
              border: active === i ? `2px solid ${borderColor || "rgba(255,255,255,0.4)"}` : `1px solid ${borderColor || "rgba(255,255,255,0.1)"}`,
              cursor:"zoom-in", aspectRatio:"16/9", background:"rgba(255,255,255,0.03)",
            }}>
            <img src={src} alt="" onError={() => setFailed(f=>({...f,[i]:true}))}
              style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            {imageAnalysis?.[i] && <ImageAIBadge analysis={imageAnalysis[i]}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClaimCard({ item, index, onReverify, isActive, onMouseEnter, onMouseLeave }) {
  const [reverifying, setReverifying] = useState(false);
  const vc     = VC[item.verdict] || VC.unverifiable;
  const hasS   = item.supporting_evidence?.filter(Boolean).length > 0;
  const hasC   = item.contradicting_evidence?.filter(Boolean).length > 0;
  const hasSrc = item.sources?.length > 0;
  const hasImg = item.images?.length > 0;

  const handleReverify = async () => {
    if (reverifying || !onReverify) return;
    setReverifying(true); await onReverify(item); setReverifying(false);
  };

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        border:`1px solid ${isActive ? vc.color + "80" : vc.border}`, borderRadius:14, overflow:"hidden",
        background: isActive ? `${vc.color}08` : "rgba(255,255,255,0.03)", marginBottom:12,
        animation:"slide-up 0.22s ease",
        transition:"border-color 0.2s, background 0.2s",
        boxShadow: isActive ? `0 0 20px ${vc.color}18` : "none",
      }}>
      {/* Accent top bar */}
      <div style={{ height:3, background:vc.color, width:"100%" }}/>

      {/* Header */}
      <div style={{ padding:"16px 18px 14px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
          <div style={{
            minWidth:24, height:24, borderRadius:12,
            background:vc.bg, border:`1px solid ${vc.border}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:11, fontWeight:700, color:vc.color, flexShrink:0,
          }}>{index+1}</div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:14, fontWeight:600, color:"#f0f2f8", lineHeight:1.55, marginBottom:10 }}>{item.claim}</p>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              {/* Verdict badge */}
              <span style={{
                fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:20,
                background:vc.bg, border:`1px solid ${vc.border}`, color:vc.text,
                letterSpacing:"0.07em", fontFamily:"'DM Mono',monospace",
              }}>{VL[item.verdict]}</span>
              <div style={{ flex:1, minWidth:100, maxWidth:180 }}><ConfBar value={item.confidence}/></div>
              <span style={{ fontSize:11, color:"rgba(200,204,220,0.6)" }}>confidence</span>
              {item.time_sensitive && (
                <span style={{ fontSize:10, padding:"2px 9px", borderRadius:20, background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.25)", color:"#fbbf24", fontFamily:"'DM Mono',monospace" }}>⏱ time-sensitive</span>
              )}
              <button onClick={handleReverify} disabled={reverifying} style={{
                marginLeft:"auto", fontSize:10, padding:"3px 10px", borderRadius:6,
                border:"1px solid rgba(255,255,255,0.1)", background:"transparent",
                color: reverifying ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.4)",
                cursor: reverifying ? "not-allowed" : "pointer",
                fontFamily:"'DM Mono',monospace", display:"flex", alignItems:"center", gap:4,
              }}>
                {reverifying ? <><span style={{ animation:"spin 0.8s linear infinite", display:"inline-block" }}>◌</span> verifying…</> : "↻ re-verify"}
              </button>
            </div>
            {item.time_sensitive && item.time_sensitive_reason && (
              <p style={{ fontSize:11, color:"rgba(252,211,77,0.9)", marginTop:5, fontStyle:"italic" }}>{item.time_sensitive_reason}</p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:"14px 18px 18px" }}>
        {item.context && (
          <div style={{ marginBottom:12, padding:"9px 13px", background:"rgba(255,255,255,0.03)", borderRadius:8, borderLeft:"3px solid rgba(255,255,255,0.1)" }}>
            <p style={{ margin:0, fontSize:12, color:"rgba(200,204,220,0.85)", fontStyle:"italic", lineHeight:1.6 }}>"{item.context}"</p>
          </div>
        )}
        <p style={{ fontSize:13, color:"#d8dce8", lineHeight:1.7, marginBottom:14 }}>
          <TypewriterText text={item.summary || ""} speed={14} delay={120} cursor={true}/>
        </p>
        {hasImg && (
          <div style={{ marginTop:14 }}>
            {/* Image label — different for truth vs correction */}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <div style={{
                width:6, height:6, borderRadius:"50%", flexShrink:0,
                background: item.image_type === "correction" ? "#f87171" : item.image_type === "truth" ? "#4ade80" : "#94a3b8",
              }}/>
              <span style={{
                fontSize:10, fontWeight:700,
                color: item.image_type === "correction" ? "#f87171" : item.image_type === "truth" ? "#4ade80" : "#94a3b8",
                textTransform:"uppercase", letterSpacing:"0.08em",
                fontFamily:"'DM Mono',monospace",
              }}>
                {item.image_label || (item.image_type === "correction" ? "What's Actually True" : "Supporting Evidence")}
              </span>
              {item.image_type === "correction" && (
                <span style={{ fontSize:10, color:"rgba(200,210,240,0.4)", fontFamily:"'DM Mono',monospace" }}>
                  — images of the correct fact
                </span>
              )}
            </div>
            <ImageGallery images={item.images} imageAnalysis={item.image_analysis}
              borderColor={item.image_type === "correction" ? "rgba(248,113,113,0.3)" : "rgba(74,222,128,0.2)"}
            />
          </div>
        )}

        {(hasS || hasC) && (
          <div style={{ display:"grid", gridTemplateColumns: hasS && hasC ? "1fr 1fr" : "1fr", gap:12, marginTop: hasImg ? 14 : 0 }}>
            {hasS && (
              <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.2)" }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#4ade80", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Supporting</p>
                {item.supporting_evidence.filter(Boolean).map((e,i) => (
                  <div key={i} style={{ display:"flex", gap:7, marginBottom:6 }}>
                    <span style={{ color:"#4ade80", fontSize:12, flexShrink:0 }}>✓</span>
                    <p style={{ margin:0, fontSize:12, color:"#d0d4e0", lineHeight:1.55 }}>
                      <TypewriterText text={e} speed={12} delay={i * 80} cursor={false}/>
                    </p>
                  </div>
                ))}
              </div>
            )}
            {hasC && (
              <div style={{ padding:"12px 14px", borderRadius:10, background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.2)" }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#f87171", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8 }}>Contradicting</p>
                {item.contradicting_evidence.filter(Boolean).map((e,i) => (
                  <div key={i} style={{ display:"flex", gap:7, marginBottom:6 }}>
                    <span style={{ color:"#f87171", fontSize:12, flexShrink:0 }}>✕</span>
                    <p style={{ margin:0, fontSize:12, color:"#d0d4e0", lineHeight:1.55 }}>
                      <TypewriterText text={e} speed={12} delay={i * 80} cursor={false}/>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {item.nuance && (
          <div style={{ marginTop:12, padding:"9px 13px", background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:8, display:"flex", gap:8 }}>
            <span style={{ fontSize:13, flexShrink:0 }}>⚠</span>
            <p style={{ margin:0, fontSize:12, color:"#fcd34d", lineHeight:1.6 }}>{item.nuance}</p>
          </div>
        )}

        {/* Counter-narrative for false/partial claims */}
        {item.counter_narrative?.correction && (
          <div style={{ marginTop:12, borderRadius:10, overflow:"hidden", border:"1px solid rgba(74,222,128,0.25)" }}>
            <div style={{ padding:"10px 14px", background:"rgba(74,222,128,0.08)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:9, fontWeight:800, padding:"2px 8px", borderRadius:20, background:"rgba(74,222,128,0.15)", border:"1px solid rgba(74,222,128,0.3)", color:"#4ade80", letterSpacing:"0.08em", fontFamily:"'DM Mono',monospace" }}>✓ CORRECTION</span>
                {item.counter_narrative.flame_count > 0 && <span>{("🔥").repeat(item.counter_narrative.flame_count)}</span>}
                {item.counter_narrative.severity && <span style={{ fontSize:9, padding:"2px 7px", borderRadius:20, background:"rgba(251,191,36,0.15)", color:"#fbbf24", border:"1px solid rgba(251,191,36,0.3)", fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{item.counter_narrative.severity?.toUpperCase()} IMPACT</span>}
              </div>
              <p style={{ fontSize:13, color:"#86efac", margin:"0 0 6px", fontWeight:600, lineHeight:1.5 }}>{item.counter_narrative.correction}</p>
              {item.counter_narrative.why_wrong && <p style={{ fontSize:11, color:"rgba(134,239,172,0.7)", margin:"0 0 5px", lineHeight:1.5 }}>{item.counter_narrative.why_wrong}</p>}
              {item.counter_narrative.verify_tip && <p style={{ fontSize:11, color:"rgba(147,197,253,0.8)", margin:0, lineHeight:1.5 }}>💡 {item.counter_narrative.verify_tip}</p>}
            </div>
          </div>
        )}

        {/* Evidence freshness */}
        {item.freshness?.freshness_label && item.freshness.freshness_label !== "Unknown" && (
          <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:item.freshness.freshness_color, flexShrink:0 }}/>
            <span style={{ fontSize:11, color:item.freshness.freshness_color, fontWeight:600, fontFamily:"'DM Mono',monospace" }}>{item.freshness.freshness_label} Evidence</span>
            <span style={{ fontSize:11, color:"rgba(200,210,240,0.5)" }}>{item.freshness.freshness_tip}</span>
          </div>
        )}

        {hasSrc && (
          <div style={{ marginTop:14 }}>
            <p style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:8, fontFamily:"'DM Mono',monospace" }}>Sources</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {item.sources.map((s,i) => (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                  display:"flex", alignItems:"flex-start", gap:9, padding:"9px 12px",
                  background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)",
                  borderRadius:8, textDecoration:"none", transition:"border-color 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.18)"}
                onMouseLeave={e => e.currentTarget.style.borderColor="rgba(255,255,255,0.08)"}
                >
                  <span style={{ fontSize:11, color:"rgba(200,204,220,0.6)", marginTop:2, flexShrink:0 }}>↗</span>
                  <div style={{ flex:1 }}>
                    <p style={{ margin:0, fontSize:12, color:"#93c5fd", fontWeight:600, lineHeight:1.4 }}>{s.title || s.url}</p>
                    {s.relevance && <p style={{ margin:"2px 0 5px", fontSize:11, color:"rgba(200,204,220,0.65)" }}>{s.relevance}</p>}
                    {s.credibility_score && <CredBadge score={s.credibility_score} label={s.credibility_label} color={s.credibility_color}/>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}