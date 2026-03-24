import React, { useState, useCallback } from "react";
import { useSSEPipeline }     from "./hooks/useSSEPipeline";
import HeroBackground         from "./components/HeroBackground";
import SummaryCards           from "./components/SummaryCards";
import AIDetectionPanel       from "./components/AIDetectionPanel";
import ClaimCard              from "./components/ClaimCard";
import ClaimTimeline          from "./components/ClaimTimeline";
import BiasPanel              from "./components/BiasPanel";
import ContradictionPanel     from "./components/ContradictionPanel";
import SourceTextHighlighter  from "./components/SourceTextHighlighter";
import SourceTrustPanel       from "./components/SourceTrustPanel";
import MisinfoPatternPanel    from "./components/MisinfoPatternPanel";
import ClaimNetworkGraph      from "./components/ClaimNetworkGraph";
import MediaAnalysisPanel     from "./components/MediaAnalysisPanel";
import LoadingTransition       from "./components/LoadingTransition";
import CompareMode            from "./components/CompareMode";
import DocVerify              from "./components/DocVerify";
import ConfidenceChart        from "./components/ConfidenceChart";

const STAGE_MESSAGES = {
  extracting: "Extracting claims from text",
  searching:  "Searching live web evidence",
  verifying:  "Verifying claims with Gemini",
  complete:   "Analysis complete",
};
const DOTS = ["", ".", "..", "..."];

function ShareButton({ report }) {
  const [copied, setCopied] = useState(false);
  const share = () => {
    try {
      const encoded = btoa(encodeURIComponent(JSON.stringify(report)));
      const url = `${window.location.origin}?report=${encoded}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };
  return (
    <button onClick={share} style={{
      padding: "7px 14px", borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.08)",
      color: copied ? "#4ade80" : "rgba(255,255,255,0.8)",
      fontSize: 12, fontWeight: 500, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 6,
      transition: "all 0.15s",
    }}>
      {copied ? "✓ Copied!" : "⬡ Share"}
    </button>
  );
}

function ExportButton() {
  return (
    <button onClick={() => window.print()} style={{
      padding: "7px 14px", borderRadius: 8,
      border: "1px solid rgba(255,255,255,0.2)",
      background: "rgba(255,255,255,0.08)",
      color: "rgba(255,255,255,0.8)",
      fontSize: 12, fontWeight: 500, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      ↓ PDF
    </button>
  );
}

// ── Sidebar stat block ─────────────────────────────────────────────────────
function SidebarBlock({ title, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, padding: "16px 18px",
      backdropFilter: "blur(12px)",
    }}>
      <p style={{
        fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase", letterSpacing: "0.1em",
        marginBottom: 14, fontFamily: "'DM Mono',monospace",
      }}>{title}</p>
      {children}
    </div>
  );
}

// ── Sidebar accuracy ring ──────────────────────────────────────────────────
function AccuracyRingSidebar({ value }) {
  const size  = 100;
  const r     = 38;
  const circ  = 2 * Math.PI * r;
  const pct   = Math.max(0, Math.min(1, isNaN(value) ? 0 : value));
  const dash  = circ * (1 - pct);
  const color = pct > 0.7 ? "#4ade80" : pct > 0.4 ? "#fbbf24" : "#f87171";
  const grade = pct > 0.8 ? "High" : pct > 0.5 ? "Mixed" : "Low";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        {/* SVG only draws the arcs — text is absolutely positioned overlay, NOT inside SVG */}
        <svg width={size} height={size}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={7}
            strokeDasharray={`${circ} ${circ}`} strokeDashoffset={0}
            transform={`rotate(-90 ${size/2} ${size/2})`}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={`${circ - dash} ${circ}`} strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition: "stroke-dasharray 1s ease" }}/>
        </svg>
        {/* Text overlay — completely separate from SVG transform */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>
            {Math.round(pct * 100)}%
          </span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{grade}</span>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar verdict bars ────────────────────────────────────────────────────
function VerdictBarsSidebar({ report }) {
  const bars = [
    { key: "trueClaims",         label: "True",        color: "#4ade80" },
    { key: "falseClaims",        label: "False",       color: "#f87171" },
    { key: "partialClaims",      label: "Partial",     color: "#fbbf24" },
    { key: "unverifiableClaims", label: "Unknown",     color: "#94a3b8" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {bars.map(b => {
        const count = report[b.key] || 0;
        const pct   = report.totalClaims > 0 ? (count / report.totalClaims) * 100 : 0;
        return (
          <div key={b.key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>{b.label}</span>
              <span style={{ fontSize: 11, color: b.color, fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>
                {count} · {Math.round(pct)}%
              </span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                width: `${pct}%`, height: "100%", background: b.color, borderRadius: 3,
                transition: "width 1s ease",
              }}/>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Confidence histogram sidebar ────────────────────────────────────────────
function ConfidenceHistSidebar({ claims }) {
  const buckets = [0, 0, 0, 0];
  (claims || []).forEach(c => {
    const p = (c.confidence || 0) * 100;
    if (p < 25) buckets[0]++; else if (p < 50) buckets[1]++;
    else if (p < 75) buckets[2]++; else buckets[3]++;
  });
  const max = Math.max(...buckets, 1);
  const labels = ["0–25", "25–50", "50–75", "75–100"];
  const colors = ["#f87171", "#fbbf24", "#a3e635", "#4ade80"];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
      {buckets.map((n, i) => {
        const h = n > 0 ? Math.max((n / max) * 52, 6) : 3;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono',monospace" }}>{n}</span>
            <div style={{ width: "100%", height: h, borderRadius: 3, background: colors[i], transition: "height 0.8s ease" }}/>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.2 }}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── AI Detection sidebar ────────────────────────────────────────────────────
function AIDetectionSidebar({ aiScore }) {
  const [exp, setExp] = useState(false);
  if (!aiScore) return null;
  const prob  = aiScore.ai_probability ?? 0.35;
  const pct   = Math.round(prob * 100);
  const isAI  = prob > 0.6;
  const isUns = prob >= 0.4 && prob <= 0.6;
  const color = isAI ? "#f87171" : isUns ? "#fbbf24" : "#4ade80";
  const label = isAI ? "AI Written" : isUns ? "Uncertain" : "Human Written";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color,
          padding: "3px 10px", borderRadius: 20,
          background: `${color}18`, border: `1px solid ${color}44`,
        }}>{label}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace" }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.9s ease" }}/>
      </div>
      <button onClick={() => setExp(e => !e)} style={{
        fontSize: 10, color: "rgba(255,255,255,0.35)", background: "none",
        border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Mono',monospace",
      }}>{exp ? "▴ less" : "▾ more info"}</button>
      {exp && (
        <div style={{ marginTop: 10 }}>
          {aiScore.reasoning && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 8 }}>{aiScore.reasoning}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {aiScore.signals?.map((s, i) => (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bias sidebar ────────────────────────────────────────────────────────────
function BiasSidebar({ biasResult }) {
  const [exp, setExp] = useState(false);
  if (!biasResult) return null;
  const score = biasResult.bias_score ?? 0;
  const pct   = Math.round(score * 100);
  const color = score > 0.6 ? "#f87171" : score > 0.35 ? "#fbbf24" : "#4ade80";
  const label = score > 0.6 ? "High Bias" : score > 0.35 ? "Moderate" : "Low Bias";
  const LPOS  = { left:8, "center-left":28, center:50, "center-right":72, right:92, none:50 };
  const LCOL  = { left:"#60a5fa","center-left":"#93c5fd",center:"#4ade80","center-right":"#fb923c",right:"#f87171",none:"#94a3b8" };
  const leaning = biasResult.political_leaning || "none";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color,
          padding: "3px 10px", borderRadius: 20,
          background: `${color}18`, border: `1px solid ${color}44`,
        }}>{label}</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono',monospace" }}>{pct}% intensity</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.9s ease" }}/>
      </div>

      {/* Political spectrum */}
      {leaning !== "none" && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ position: "relative", height: 18 }}>
            <div style={{
              position: "absolute", top: 7, left: 0, right: 0, height: 3, borderRadius: 2,
              background: "linear-gradient(to right, #3b82f6, #60a5fa, #4ade80, #fb923c, #ef4444)",
            }}/>
            {["L", "C", "R"].map((l, i) => (
              <span key={l} style={{
                position: "absolute", top: 0, fontSize: 8,
                color: "rgba(255,255,255,0.3)",
                left: i === 0 ? 0 : i === 1 ? "50%" : undefined,
                right: i === 2 ? 0 : undefined,
                transform: i === 1 ? "translateX(-50%)" : "none",
              }}>{l}</span>
            ))}
            <div style={{
              position: "absolute", top: 3, width: 10, height: 10, borderRadius: "50%",
              background: LCOL[leaning] || "#94a3b8",
              border: "2px solid rgba(255,255,255,0.3)",
              left: `${LPOS[leaning] ?? 50}%`,
              transform: "translateX(-50%)",
              transition: "left 0.6s ease",
            }}/>
          </div>
        </div>
      )}

      <button onClick={() => setExp(e => !e)} style={{
        fontSize: 10, color: "rgba(255,255,255,0.35)", background: "none",
        border: "none", cursor: "pointer", padding: 0, fontFamily: "'DM Mono',monospace",
      }}>{exp ? "▴ less" : "▾ signals"}</button>
      {exp && biasResult.signals?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {biasResult.signals.map((s, i) => (
            <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { status, stage, stageIndex, logs, aiScore, report, logsEndRef, run, setReport } = useSSEPipeline();
  const [submittedText, setSubmitted] = useState("");
  const [compareMode, setCompareMode]   = useState(false);
  const [docVerifyOpen, setDocVerify]   = useState(false);
  const [activeClaim, setActiveClaim]     = useState(null);
  const [translating, setTranslating]     = useState(false);
  const [translatedReport, setTranslated] = useState(null);
  const [showEnglish, setShowEnglish]     = useState(false);
  const [dotFrame, setDotFrame]       = useState(0);

  const isIdle     = status === "idle";
  const isRunning  = status === "running";
  const isComplete = status === "complete";

  React.useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setDotFrame(f => (f + 1) % 4), 480);
    return () => clearInterval(t);
  }, [isRunning]);

  React.useEffect(() => {
    try {
      const params  = new URLSearchParams(window.location.search);
      const encoded = params.get("report");
      if (encoded && setReport) setReport(JSON.parse(decodeURIComponent(atob(encoded))));
    } catch (_) {}
  }, []);

  const handleRun   = (v, t, opts = {}) => { setSubmitted(v); run(v, t, opts); };
  const handleReset = () => { window.history.pushState({}, "", "/"); window.location.reload(); };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); handleReset(); }
      if (e.key === "e" && isComplete && report) window.print();
      if (e.key === "s" && isComplete && report) {
        try {
          const encoded = btoa(encodeURIComponent(JSON.stringify(report)));
          navigator.clipboard.writeText(window.location.origin + "?report=" + encoded);
        } catch(_) {}
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isComplete, report]);

  // Save to history in localStorage
  React.useEffect(() => {
    if (isComplete && report && submittedText) {
      try {
        const hist = JSON.parse(localStorage.getItem("fc_history") || "[]");
        const verdicts = (report.claims || []).map(c => c.verdict);
        const entry = { text: submittedText.slice(0, 80), ts: Date.now(), accuracy: report.overallAccuracy, claims: report.totalClaims, verdicts };
        const updated = [entry, ...hist.filter(h => h.text !== entry.text)].slice(0, 5);
        localStorage.setItem("fc_history", JSON.stringify(updated));
      } catch(_) {}
    }
  }, [isComplete]);

  // Live translation — streams translated claims one by one
  const handleTranslate = async (targetLang) => {
    if (!report) return;
    setTranslating(true);
    setTranslated(null);

    // Always translate FROM the original report, not a previously translated version
    const sourceReport = report;
    const newClaims    = [...(sourceReport.claims || [])];

    try {
      const res     = await fetch("/api/translate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ report: sourceReport, language: targetLang }),
      });
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") { setTranslating(false); return; }
          try {
            const data = JSON.parse(payload);
            // Live update — swap claim as it arrives
            if (data.claimResult != null && data.claimIndex != null) {
              newClaims[data.claimIndex] = data.claimResult;
              setTranslated(prev => ({
                ...(prev || sourceReport),
                claims: [...newClaims],
              }));
            }
            if (data.report) {
              setTranslated(data.report);
              setTranslating(false);
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.error("Translation error:", e);
    }
    setTranslating(false);
  };

  const handleReverify = useCallback(async (claimItem) => {
    try {
      const res     = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: claimItem.claim, input_type: "text" }) });
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") return;
          try {
            const data = JSON.parse(payload);
            if (data.report?.claims?.[0] && setReport) {
              setReport(prev => prev ? { ...prev, claims: prev.claims.map(c => c.id === claimItem.id ? { ...c, ...data.report.claims[0], id: claimItem.id } : c) } : prev);
            }
          } catch (_) {}
        }
      }
    } catch (e) { console.error(e); }
  }, [setReport]);

  const handleRestore = (historyItem) => {
    // Restore just re-runs the same text — history only stores the text
    if (historyItem?.text) {
      handleRun(historyItem.text, "text");
    }
  };

  if (compareMode) return <CompareMode onBack={() => setCompareMode(false)} />;
  if (isIdle) return (
    <>
      <HeroBackground onRun={handleRun} isRunning={false} onRestore={handleRestore}
        onCompare={() => setCompareMode(true)}
        onDocVerify={() => setDocVerify(true)} />
      {docVerifyOpen && <DocVerify onClose={() => setDocVerify(false)} />}
    </>
  );

  return (
    <>
    {docVerifyOpen && <DocVerify onClose={() => setDocVerify(false)} />}
    <div style={{ minHeight: "100vh", position: "relative", fontFamily: "var(--font-body)" }}>

      {/* ── Results page background — dark with aurora ── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "#080c14" }}>
        {/* Aurora pools */}
        <div style={{ position: "absolute", width: 600, height: 600, top: "-100px", left: "-100px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)" }}/>
        <div style={{ position: "absolute", width: 500, height: 500, top: "20%", right: "-80px", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)" }}/>
        <div style={{ position: "absolute", width: 700, height: 400, bottom: "10%", left: "20%", borderRadius: "50%", background: "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)" }}/>
        {/* Subtle grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}/>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes slide-up { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        @media print { .no-print{display:none!important} * { background: white !important; color: black !important; } }
        [data-sidebar]::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header ── */}
      <header className="no-print" style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(8,12,20,0.85)", backdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto", padding: "0 28px",
          display: "flex", alignItems: "center", justifyContent: "space-between", height: 56,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: "'Syne',sans-serif",
            }}>F</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", fontFamily: "'Syne',sans-serif" }}>
              FactCheck AI
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isComplete && report && (
              <>
                <ShareButton report={report} />
                <ExportButton />
                <span style={{ fontSize:10, color:"rgba(200,210,240,0.25)", fontFamily:"'DM Mono',monospace" }}>
                  E=export · S=share · ⌘K=new
                </span>
              </>
            )}
            {/* Language toggle — live translation */}
            {isComplete && report?.langInfo && !report.langInfo.is_english && (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{
                  fontSize:10, padding:"3px 9px",
                  background:"rgba(99,179,237,0.12)",
                  border:"1px solid rgba(99,179,237,0.3)",
                  borderRadius:20, color:"#63b3ed",
                  fontFamily:"'DM Mono',monospace",
                }}>🌐 {report.langInfo.language}</span>
                <button
                  onClick={() => {
                    if (showEnglish) {
                      setShowEnglish(false);
                      setTranslated(null);
                    } else {
                      setShowEnglish(true);
                      handleTranslate("English");
                    }
                  }}
                  disabled={translating}
                  style={{
                    fontSize:10, padding:"4px 12px", borderRadius:20, cursor:"pointer",
                    border:"1px solid rgba(255,255,255,0.2)",
                    background: showEnglish ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
                    color:"rgba(200,210,240,0.8)",
                    fontFamily:"'DM Mono',monospace",
                    display:"flex", alignItems:"center", gap:5,
                    transition:"all 0.15s",
                  }}
                >
                  {translating
                    ? <><span style={{animation:"spin 0.8s linear infinite",display:"inline-block"}}>◌</span> Translating…</>
                    : showEnglish ? "🌐 Show Original" : "🇬🇧 Show in English"
                  }
                </button>
              </div>
            )}
            {["Gemini 2.5 Flash Lite", "Tavily"].map(t => (
              <span key={t} style={{ fontSize: 10, padding: "3px 9px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{t}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "24px 28px 80px" }}>

        {/* Compact input strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: 24, padding: "12px 16px",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, backdropFilter: "blur(8px)",
        }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>query</span>
          <div style={{
            flex: 1, fontSize: 13, color: "rgba(255,255,255,0.55)",
            fontFamily: "'DM Mono',monospace",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>{submittedText}</div>
          <button onClick={handleReset} className="no-print" style={{
            padding: "5px 12px", borderRadius: 7,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.45)", fontSize: 11, cursor: "pointer",
            whiteSpace: "nowrap", fontFamily: "'DM Mono',monospace",
          }}>✕ new check</button>
        </div>

        {/* Analyzing — extraordinary loading transition */}
        {isRunning && (
          <LoadingTransition stage={stage} logs={logs} stageIndex={stageIndex} />
        )}

        {/* ── Two-column report layout ── */}
        {isComplete && report && (
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, alignItems: "start" }}>

            {/* ── LEFT SIDEBAR ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 72, maxHeight: "calc(100vh - 96px)", overflowY: "auto", scrollbarWidth: "none" }} data-sidebar="true">

              {/* Overall accuracy */}
              <SidebarBlock title="Overall Accuracy">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <AccuracyRingSidebar value={report.overallAccuracy} />
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", fontFamily: "'DM Mono',monospace" }}>
                    {report.totalClaims} claims verified
                    {report.timeSensitiveClaims > 0 && ` · ${report.timeSensitiveClaims} time-sensitive`}
                  </p>
                </div>
              </SidebarBlock>

              {/* Verdict distribution */}
              <SidebarBlock title="Verdict Distribution">
                <VerdictBarsSidebar report={report} />
              </SidebarBlock>

              {/* Confidence histogram */}
              <SidebarBlock title="Confidence Distribution">
                <ConfidenceHistSidebar claims={report.claims} />
              </SidebarBlock>

              {/* Severity summary */}
              {report.severityCounts && Object.values(report.severityCounts).some(v => v > 0) && (
                <SidebarBlock title="Danger Level">
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {[
                      { key:"high",   label:"High Risk",   color:"#f87171", flames:"🔥🔥🔥" },
                      { key:"medium", label:"Medium Risk",  color:"#fbbf24", flames:"🔥🔥" },
                      { key:"low",    label:"Low Risk",     color:"#94a3b8", flames:"🔥" },
                    ].map(s => (
                      <div key={s.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:11 }}>{s.flames}</span>
                          <span style={{ fontSize:11, color:s.color, fontWeight:500 }}>{s.label}</span>
                        </div>
                        <span style={{ fontSize:13, fontWeight:800, color:s.color, fontFamily:"'Syne',sans-serif" }}>
                          {report.severityCounts[s.key] || 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </SidebarBlock>
              )}

              {/* AI detection */}
              {aiScore && (
                <SidebarBlock title="Content Origin">
                  <AIDetectionSidebar aiScore={aiScore} />
                </SidebarBlock>
              )}

              {/* Bias */}
              {report.biasResult && (
                <SidebarBlock title="Bias Detection">
                  <BiasSidebar biasResult={report.biasResult} />
                </SidebarBlock>
              )}

            </div>

            {/* ── RIGHT: Claims ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Article media AI detection — only shown for URL inputs */}
              {report.articleMedia?.available && report.articleMedia?.images?.length > 0 && (
                <MediaAnalysisPanel articleMedia={report.articleMedia} />
              )}

              {/* Truth timeline */}
              <ClaimTimeline claims={report.claims} />

              {/* Contradictions */}
              {report.contradictions?.length > 0 && (
                <ContradictionPanel contradictions={report.contradictions} claims={report.claims} />
              )}

              {/* Source trust + misinfo panels */}
              {report.trustResult && (
                <SourceTrustPanel trustResult={report.trustResult} wayback={report.wayback} />
              )}
              {report.misinoResult && (
                <MisinfoPatternPanel misinoResult={report.misinoResult} />
              )}
              {/* Claim network graph */}
              {report.graphData?.nodes?.length > 1 && (
                <ClaimNetworkGraph graphData={report.graphData} onClaimClick={(n) => setActiveClaim(report.claims.find(c => c.id === n.id) || null)} />
              )}

              {/* Source text highlighter */}
              {report.originalText && (
                <SourceTextHighlighter
                  originalText={report.originalText}
                  claims={report.claims}
                  activeClaim={activeClaim}
                  onClaimHover={setActiveClaim}
                />
              )}

              {/* Claims list */}
              <div style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16, padding: 24,
                backdropFilter: "blur(12px)",
              }}>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 2, fontFamily: "'Syne',sans-serif" }}>
                    Claim Breakdown
                  </h2>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono',monospace" }}>
                    {report.totalClaims} claims extracted and verified
                  </p>
                </div>
                {(translatedReport?.claims || report.claims).map((item, i) => (
                  <ClaimCard
                    key={item.id || i} item={item} index={i}
                    onReverify={handleReverify}
                    isActive={activeClaim?.id === item.id}
                    onMouseEnter={() => setActiveClaim(item)}
                    onMouseLeave={() => setActiveClaim(null)}
                  />
                ))}
              </div>

            </div>
          </div>
        )}

        {status === "error" && (
          <div style={{ padding: "16px 20px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12 }}>
            <p style={{ color: "#f87171", fontSize: 14 }}>Pipeline error — check backend is running on port 8000 and API keys are set in <code>.env</code>.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}