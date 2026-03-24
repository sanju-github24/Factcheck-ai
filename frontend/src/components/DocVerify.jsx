import React, { useState, useRef } from "react";
import TypewriterText from "./TypewriterText";

const VC = {
  true:             { color:"#4ade80", bg:"rgba(74,222,128,0.1)",  border:"rgba(74,222,128,0.3)",  icon:"✓", label:"TRUE" },
  false:            { color:"#f87171", bg:"rgba(248,113,113,0.1)", border:"rgba(248,113,113,0.3)", icon:"✗", label:"FALSE" },
  "partially true": { color:"#fbbf24", bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.3)",  icon:"~", label:"PARTIAL" },
  "not mentioned":  { color:"#94a3b8", bg:"rgba(148,163,184,0.1)", border:"rgba(148,163,184,0.2)", icon:"?", label:"NOT IN DOC" },
  unverifiable:     { color:"#94a3b8", bg:"rgba(148,163,184,0.1)", border:"rgba(148,163,184,0.2)", icon:"?", label:"UNVERIFIABLE" },
};

function VerdictCard({ result, stage, loading, log }) {
  if (loading) return (
    <div style={{ padding:"18px 20px", borderRadius:14,
      background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <span style={{ animation:"spin 0.9s linear infinite", display:"inline-block", fontSize:18, color:"#63b3ed" }}>◌</span>
        <span style={{ fontSize:12, color:"rgba(200,210,240,0.6)", fontFamily:"'DM Mono',monospace" }}>
          {log || (stage===1 ? "Searching document…" : "Searching web…")}
        </span>
      </div>
    </div>
  );
  if (!result) return null;

  const v   = VC[result.verdict] || VC.unverifiable;
  const pct = Math.round((result.confidence ?? 0) * 100);

  return (
    <div style={{ borderRadius:14, overflow:"hidden", border:`1px solid ${v.border}`,
      animation:"slide-up 0.3s ease" }}>

      {/* Header */}
      <div style={{ padding:"14px 18px", background:v.bg,
        display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
          background:`${v.color}20`, border:`2px solid ${v.color}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, color:v.color, fontWeight:900 }}>{v.icon}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
            <span style={{ fontSize:15, fontWeight:800, color:v.color,
              fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em" }}>{v.label}</span>
            <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20,
              background:`${v.color}20`, color:v.color,
              fontFamily:"'DM Mono',monospace", fontWeight:700 }}>{pct}% confidence</span>
            <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20,
              background: stage===1 ? "rgba(99,179,237,0.15)" : "rgba(251,191,36,0.15)",
              color: stage===1 ? "#63b3ed" : "#fbbf24",
              border:`1px solid ${stage===1 ? "rgba(99,179,237,0.3)" : "rgba(251,191,36,0.3)"}`,
              fontFamily:"'DM Mono',monospace" }}>
              {stage===1 ? "📄 From Document" : "🌐 From Web"}
            </span>
          </div>
          <div style={{ marginTop:6, height:4, background:"rgba(255,255,255,0.1)",
            borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:`${pct}%`, height:"100%", background:v.color,
              borderRadius:3, transition:"width 1s ease" }}/>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding:"12px 18px 16px", background:"rgba(0,0,0,0.2)" }}>
        <p style={{ fontSize:13, color:"#d8dce8", margin:"0 0 12px", lineHeight:1.65 }}>
          <TypewriterText text={result.summary||""} speed={12} cursor={false}
            style={{ color:"#d8dce8" }}/>
        </p>

        {/* Evidence */}
        {(result.supporting?.length > 0 || result.contradicting?.length > 0) && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            {result.supporting?.length > 0 && (
              <div style={{ padding:"10px 12px", background:"rgba(74,222,128,0.06)",
                border:"1px solid rgba(74,222,128,0.2)", borderRadius:10 }}>
                <p style={{ fontSize:9, color:"#4ade80", fontWeight:700, letterSpacing:"0.08em",
                  fontFamily:"'DM Mono',monospace", marginBottom:6 }}>✓ SUPPORTING</p>
                {result.supporting.slice(0,3).map((s,i) => (
                  <p key={i} style={{ fontSize:11, color:"#86efac", margin:"0 0 4px",
                    lineHeight:1.5, fontStyle:"italic" }}>"{s}"</p>
                ))}
              </div>
            )}
            {result.contradicting?.length > 0 && (
              <div style={{ padding:"10px 12px", background:"rgba(248,113,113,0.06)",
                border:"1px solid rgba(248,113,113,0.2)", borderRadius:10 }}>
                <p style={{ fontSize:9, color:"#f87171", fontWeight:700, letterSpacing:"0.08em",
                  fontFamily:"'DM Mono',monospace", marginBottom:6 }}>✗ CONTRADICTING</p>
                {result.contradicting.slice(0,3).map((s,i) => (
                  <p key={i} style={{ fontSize:11, color:"#fca5a5", margin:"0 0 4px",
                    lineHeight:1.5, fontStyle:"italic" }}>"{s}"</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Relevant section from doc */}
        {result.relevant_section && (
          <div style={{ padding:"10px 12px", marginBottom:10,
            background:"rgba(99,179,237,0.06)",
            borderLeft:"3px solid rgba(99,179,237,0.5)", borderRadius:"0 8px 8px 0" }}>
            <p style={{ fontSize:9, color:"#63b3ed", fontFamily:"'DM Mono',monospace",
              fontWeight:700, marginBottom:5 }}>📄 FROM DOCUMENT</p>
            <p style={{ fontSize:11, color:"rgba(200,210,240,0.75)", margin:0,
              lineHeight:1.6, fontStyle:"italic" }}>"{result.relevant_section}"</p>
          </div>
        )}

        {/* Web sources */}
        {result.sources?.length > 0 && (
          <div>
            <p style={{ fontSize:9, color:"rgba(200,210,240,0.35)",
              fontFamily:"'DM Mono',monospace", marginBottom:6, fontWeight:700 }}>WEB SOURCES</p>
            {result.sources.slice(0,4).map((s,i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5,
                  textDecoration:"none" }}>
                <span style={{ fontSize:10, color:"#63b3ed" }}>↗</span>
                <span style={{ fontSize:11, color:"#93c5fd", flex:1,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.title}</span>
                {s.credibility_score && (
                  <span style={{ fontSize:9, padding:"1px 6px", borderRadius:20,
                    background:"rgba(99,179,237,0.1)", color:"#63b3ed",
                    fontFamily:"'DM Mono',monospace", flexShrink:0 }}>
                    {s.credibility_score}
                  </span>
                )}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonBanner({ r1, r2 }) {
  const agree = r1.verdict === r2.verdict;
  const v1 = VC[r1.verdict] || VC.unverifiable;
  const v2 = VC[r2.verdict] || VC.unverifiable;
  return (
    <div style={{ padding:"14px 16px", borderRadius:12,
      background: agree ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
      border:`1px solid ${agree ? "rgba(74,222,128,0.25)" : "rgba(248,113,113,0.25)"}` }}>
      <p style={{ fontSize:12, fontWeight:700, color:"#fff",
        fontFamily:"'Syne',sans-serif", marginBottom:10 }}>
        {agree ? "✓ Both sources agree" : "⚡ Sources disagree"}
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[{label:"Document", r:r1, col:"#63b3ed"},{label:"Web Search", r:r2, col:"#fbbf24"}].map(({label,r,col})=>{
          const v = VC[r.verdict] || VC.unverifiable;
          return (
            <div key={label} style={{ padding:"10px 12px", borderRadius:10,
              background:`${col}08`, border:`1px solid ${col}25`, textAlign:"center" }}>
              <p style={{ fontSize:10, color:col, fontFamily:"'DM Mono',monospace", marginBottom:4 }}>{label}</p>
              <p style={{ fontSize:15, fontWeight:800, color:v.color,
                fontFamily:"'Syne',sans-serif", margin:"0 0 3px", textTransform:"uppercase" }}>{r.verdict}</p>
              <p style={{ fontSize:10, color:"rgba(200,210,240,0.5)", fontFamily:"'DM Mono',monospace" }}>
                {Math.round((r.confidence??0)*100)}% confidence
              </p>
            </div>
          );
        })}
      </div>
      {!agree && (
        <p style={{ fontSize:11, color:"#fca5a5", marginTop:10, lineHeight:1.5 }}>
          The document and web results disagree. The document may contain outdated or incorrect information, or the web sources may lack context. Consider both perspectives.
        </p>
      )}
    </div>
  );
}

// ── Extract text from file ────────────────────────────────────────────────
async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) return await file.text();
  if (name.endsWith(".pdf")) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!window.pdfjsLib) {
            await new Promise((res,rej) => {
              const s = document.createElement("script");
              s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
              s.onload = res; s.onerror = rej; document.head.appendChild(s);
            });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
          const pdf = await window.pdfjsLib.getDocument({data:e.target.result}).promise;
          let text = "";
          for (let p=1; p<=Math.min(pdf.numPages,15); p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            text += content.items.map(i=>i.str).join(" ") + "\n\n";
          }
          resolve(text.trim());
        } catch { resolve(""); }
      };
      reader.readAsArrayBuffer(file);
    });
  }
  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!window.mammoth) {
            await new Promise((res,rej) => {
              const s = document.createElement("script");
              s.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
              s.onload = res; s.onerror = rej; document.head.appendChild(s);
            });
          }
          const result = await window.mammoth.extractRawText({arrayBuffer:e.target.result});
          resolve(result.value);
        } catch { resolve(""); }
      };
      reader.readAsArrayBuffer(file);
    });
  }
  return await file.text().catch(()=>"");
}

// ── SSE stream helper ─────────────────────────────────────────────────────
async function streamDocVerify(body, onEvent, doneSignal) {
  const res     = await fetch("/api/docverify", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify(body),
  });
  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer    = "";
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, {stream:true});
    const lines = buffer.split("\n"); buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === doneSignal) return;
      try { onEvent(JSON.parse(payload)); } catch(_) {}
    }
  }
}

// ── Main component ────────────────────────────────────────────────────────
export default function DocVerify({ onClose }) {
  const [step, setStep]           = useState("upload");  // upload→query→stage1→stage2
  const [file, setFile]           = useState(null);
  const [docText, setDocText]     = useState("");
  const [extracting, setExtracting] = useState(false);
  const [query, setQuery]         = useState("");
  const [log, setLog]             = useState("");
  const [webEnabled, setWeb]      = useState(false);
  const [stage1, setStage1]       = useState(null);
  const [stage2, setStage2]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const fileRef                   = useRef(null);

  // Handle file drop / select
  const handleFile = async (f) => {
    setFile(f); setExtracting(true); setLog("Extracting text…");
    const text = await extractText(f);
    setDocText(text);
    setExtracting(false);
    setLog(text ? `✓ ${text.length.toLocaleString()} characters extracted` : "❌ Could not extract text");
    if (text) setStep("query");
  };

  // Stage 1 — document only
  const runStage1 = async () => {
    if (!query.trim() || !docText) return;
    setStep("stage1"); setStage1(null); setStage2(null);
    setLoading(true); setLog("");
    await streamDocVerify(
      { document_text: docText, query: query.trim(), stage: 1 },
      (data) => {
        if (data.message) setLog(data.message);
        if (data.result)  { setStage1(data.result); setLoading(false); }
        if (data.step === "error") setLoading(false);
      },
      "[STAGE1_DONE]"
    );
    setLoading(false);
    // Auto-run Stage 2 if web toggle was ON before submitting
    if (webEnabled) {
      await runStage2();
    }
  };

  // Stage 2 — web search
  const runStage2 = async () => {
    setStep("stage2"); setStage2(null);
    setLoading(true); setLog("");
    await streamDocVerify(
      { document_text: docText, query: query.trim(), stage: 2 },
      (data) => {
        if (data.message) setLog(data.message);
        if (data.result)  { setStage2(data.result); setLoading(false); }
        if (data.step === "error") setLoading(false);
      },
      "[DONE]"
    );
    setLoading(false);
  };

  const reset = () => {
    setStep("upload"); setFile(null); setDocText("");
    setQuery(""); setStage1(null); setStage2(null);
    setLog(""); setWeb(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:1000,
      background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }} onClick={e => e.target===e.currentTarget && onClose()}>

      <div style={{ width:"100%", maxWidth:680, maxHeight:"92vh",
        background:"#080c14", border:"1px solid rgba(255,255,255,0.12)",
        borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column",
        boxShadow:"0 24px 80px rgba(0,0,0,0.9)" }}>

        {/* ── Header ── */}
        <div style={{ padding:"16px 22px", borderBottom:"1px solid rgba(255,255,255,0.08)",
          background:"rgba(255,255,255,0.04)",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <p style={{ fontSize:14, fontWeight:700, color:"#fff", margin:0,
              fontFamily:"'Syne',sans-serif" }}>Document Fact Verifier</p>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4 }}>
              {["Upload Doc","Enter Claim","Stage 1: Document","Stage 2: Web"].map((s,i)=>{
                const active = ["upload","query","stage1","stage2"][i] === step ||
                               (step==="stage2" && i<=2) ||
                               (step==="stage1" && i<=1) ||
                               (step==="query" && i<=0);
                const done   = (step==="query"&&i===0)||(step==="stage1"&&i<=1)||
                               (step==="stage2"&&i<=2);
                return (
                  <React.Fragment key={s}>
                    {i>0 && <span style={{ color:"rgba(255,255,255,0.15)", fontSize:10 }}>›</span>}
                    <span style={{ fontSize:9, fontFamily:"'DM Mono',monospace",
                      color: done ? "#4ade80" : active ? "#63b3ed" : "rgba(200,210,240,0.3)",
                      fontWeight: active||done ? 700 : 400 }}>
                      {done && i<3 ? "✓ " : ""}{s}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {step !== "upload" && (
              <button onClick={reset} style={{ padding:"6px 12px", borderRadius:8,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.12)",
                color:"rgba(200,210,240,0.6)", fontSize:11, cursor:"pointer",
                fontFamily:"'DM Mono',monospace" }}>↺ Reset</button>
            )}
            <button onClick={onClose} style={{ width:30, height:30, borderRadius:"50%",
              background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)",
              color:"rgba(200,210,240,0.6)", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex:1, overflowY:"auto", padding:22,
          display:"flex", flexDirection:"column", gap:16, scrollbarWidth:"none" }}>

          {/* STEP 1 — Upload */}
          {(step === "upload" || step === "query") && (
            <div style={{ padding:"16px 18px", borderRadius:14,
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(99,179,237,0.2)" }}>
              <p style={{ fontSize:10, fontWeight:700, color:"#63b3ed", letterSpacing:"0.08em",
                fontFamily:"'DM Mono',monospace", marginBottom:12 }}>
                STEP 1 — UPLOAD DOCUMENT
              </p>

              {!file ? (
                <div onClick={()=>fileRef.current?.click()}
                  onDragOver={e=>e.preventDefault()}
                  onDrop={e=>{e.preventDefault(); handleFile(e.dataTransfer.files[0]);}}
                  style={{ border:"2px dashed rgba(99,179,237,0.3)", borderRadius:12,
                    padding:"32px 20px", textAlign:"center", cursor:"pointer",
                    transition:"all 0.2s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(99,179,237,0.6)"}
                  onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(99,179,237,0.3)"}>
                  <p style={{ fontSize:32, margin:"0 0 10px" }}>📄</p>
                  <p style={{ fontSize:13, color:"rgba(200,210,240,0.75)", margin:"0 0 5px",
                    fontFamily:"'Inter',sans-serif" }}>
                    Drop PDF, DOCX, or TXT file here
                  </p>
                  <p style={{ fontSize:10, color:"rgba(200,210,240,0.35)", margin:0,
                    fontFamily:"'DM Mono',monospace" }}>or click to browse</p>
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md"
                    style={{ display:"none" }}
                    onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
                </div>
              ) : (
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:24 }}>📄</span>
                  <div style={{ flex:1 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:"#fff", margin:0 }}>{file.name}</p>
                    <p style={{ fontSize:11, color: extracting ? "#63b3ed" :
                      docText ? "#4ade80" : "#f87171", margin:0,
                      fontFamily:"'DM Mono',monospace" }}>
                      {extracting ? "⏳ " : ""}{log}
                    </p>
                  </div>
                  <button onClick={reset} style={{ fontSize:11, padding:"4px 10px",
                    borderRadius:8, background:"rgba(248,113,113,0.1)",
                    border:"1px solid rgba(248,113,113,0.3)",
                    color:"#f87171", cursor:"pointer" }}>Remove</button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2 — Enter Claim */}
          {step === "query" && docText && (
            <div style={{ padding:"16px 18px", borderRadius:14,
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)" }}>
              <p style={{ fontSize:10, fontWeight:700, color:"#63b3ed", letterSpacing:"0.08em",
                fontFamily:"'DM Mono',monospace", marginBottom:12 }}>
                STEP 2 — ENTER CLAIM TO VERIFY
              </p>
              <p style={{ fontSize:11, color:"rgba(200,210,240,0.45)", margin:"0 0 12px",
                fontFamily:"'Inter',sans-serif" }}>
                Enter a specific factual claim. The system will first verify it against your document only — web search is a separate optional step.
              </p>
              <textarea value={query} onChange={e=>setQuery(e.target.value)}
                placeholder="e.g. The company revenue was $5 billion in 2024"
                rows={3} style={{ width:"100%", padding:"12px 14px", borderRadius:10,
                  border:"1px solid rgba(255,255,255,0.12)", fontSize:13,
                  color:"#e8eaf0", fontFamily:"'Inter',sans-serif",
                  background:"rgba(255,255,255,0.05)", resize:"none",
                  outline:"none", boxSizing:"border-box", lineHeight:1.6 }}
                onFocus={e=>e.target.style.borderColor="rgba(99,179,237,0.5)"}
                onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.12)"}/>

              {/* Web Search Toggle */}
              <div style={{ marginTop:12, padding:"12px 14px", borderRadius:10,
                background: webEnabled ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.03)",
                border:`1px solid ${webEnabled ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.1)"}`,
                display:"flex", alignItems:"center", justifyContent:"space-between",
                transition:"all 0.2s" }}>
                <div>
                  <p style={{ fontSize:12, fontWeight:600, margin:0,
                    color: webEnabled ? "#fbbf24" : "rgba(200,210,240,0.6)",
                    fontFamily:"'Inter',sans-serif" }}>
                    🌐 Also verify with Web Search
                  </p>
                  <p style={{ fontSize:10, margin:"3px 0 0",
                    color: webEnabled ? "rgba(251,191,36,0.6)" : "rgba(200,210,240,0.3)",
                    fontFamily:"'DM Mono',monospace" }}>
                    {webEnabled
                      ? "ON — will run Stage 1 (doc) then Stage 2 (web) automatically"
                      : "OFF — verify from document only, web search optional later"}
                  </p>
                </div>
                {/* Toggle switch */}
                <div onClick={()=>setWeb(w=>!w)}
                  style={{ width:44, height:24, borderRadius:12, cursor:"pointer",
                    background: webEnabled ? "#fbbf24" : "rgba(255,255,255,0.15)",
                    position:"relative", transition:"background 0.2s", flexShrink:0 }}>
                  <div style={{ position:"absolute", top:3,
                    left: webEnabled ? 23 : 3,
                    width:18, height:18, borderRadius:"50%",
                    background:"#fff", transition:"left 0.2s",
                    boxShadow:"0 1px 4px rgba(0,0,0,0.4)" }}/>
                </div>
              </div>

              {/* Submit button */}
              <button onClick={runStage1} disabled={!query.trim()||loading}
                style={{ marginTop:10, width:"100%", padding:"12px",
                  borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer",
                  background: query.trim() ? "rgba(99,179,237,0.2)" : "rgba(255,255,255,0.05)",
                  border:`1px solid ${query.trim() ? "rgba(99,179,237,0.5)" : "rgba(255,255,255,0.1)"}`,
                  color: query.trim() ? "#63b3ed" : "rgba(255,255,255,0.25)",
                  fontFamily:"'Inter',sans-serif",
                  display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                {webEnabled ? "📄 Verify Document → then Web Search" : "📄 Verify Against Document Only"}
              </button>
            </div>
          )}

          {/* STAGE 1 RESULT */}
          {(step === "stage1" || step === "stage2") && (
            <div>
              <p style={{ fontSize:10, fontWeight:700, color:"#63b3ed",
                fontFamily:"'DM Mono',monospace", letterSpacing:"0.08em", marginBottom:8 }}>
                STAGE 1 — DOCUMENT VERIFICATION
              </p>
              <VerdictCard result={stage1} stage={1}
                loading={loading && step==="stage1"} log={log}/>
            </div>
          )}

          {/* Stage 2 CTA — only shown after stage 1 completes */}
          {step === "stage1" && stage1 && !loading && (
            <div style={{ padding:"16px 18px", borderRadius:12,
              background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.25)" }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#fbbf24",
                fontFamily:"'Syne',sans-serif", marginBottom:6 }}>
                Want to verify with live web search?
              </p>
              <p style={{ fontSize:11, color:"rgba(200,210,240,0.5)", margin:"0 0 14px",
                fontFamily:"'Inter',sans-serif", lineHeight:1.6 }}>
                Stage 1 verified the claim using only your document.
                Click below to also search Tavily's live web index — results will be compared side by side.
              </p>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={runStage2}
                  style={{ flex:1, padding:"11px", borderRadius:10,
                    fontSize:13, fontWeight:700, cursor:"pointer",
                    background:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.4)",
                    color:"#fbbf24", fontFamily:"'Inter',sans-serif",
                    display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  🌐 Stage 2 — Verify with Web Search
                </button>
                <button onClick={onClose}
                  style={{ padding:"11px 16px", borderRadius:10, fontSize:12,
                    background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)",
                    color:"rgba(200,210,240,0.4)", cursor:"pointer",
                    fontFamily:"'DM Mono',monospace" }}>Done</button>
              </div>
            </div>
          )}

          {/* STAGE 2 RESULT */}
          {step === "stage2" && (
            <div>
              <p style={{ fontSize:10, fontWeight:700, color:"#fbbf24",
                fontFamily:"'DM Mono',monospace", letterSpacing:"0.08em", marginBottom:8 }}>
                STAGE 2 — WEB SEARCH VERIFICATION
              </p>
              <VerdictCard result={stage2} stage={2}
                loading={loading && step==="stage2"} log={log}/>
            </div>
          )}

          {/* COMPARISON */}
          {stage1 && stage2 && !loading && (
            <ComparisonBanner r1={stage1} r2={stage2}/>
          )}

        </div>

        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes slide-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
          div::-webkit-scrollbar{display:none}
          textarea::placeholder{color:rgba(255,255,255,0.2)}
        `}</style>
      </div>
    </div>
  );
}