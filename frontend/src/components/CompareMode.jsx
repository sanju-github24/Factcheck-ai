import React, { useState, useRef } from "react";
import TypewriterText from "./TypewriterText";

const VERDICT_COLORS = {
  true:             { color: "#4ade80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.3)"  },
  false:            { color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.3)" },
  "partially true": { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)"  },
  unverifiable:     { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" },
};

const STAGES = {
  fetching:   "Fetching both sources…",
  extracting: "Extracting & verifying claims…",
  comparing:  "Running cross-source analysis…",
  complete:   "Comparison complete",
};

function AccuracyBadge({ value, label }) {
  const pct   = Math.round((value ?? 0) * 100);
  const color = value > 0.7 ? "#4ade80" : value > 0.4 ? "#fbbf24" : "#f87171";
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: "'Syne',sans-serif", lineHeight: 1 }}>
        {pct}%
      </div>
      <div style={{ fontSize: 10, color: "rgba(200,210,240,0.5)", fontFamily: "'DM Mono',monospace", marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

function ClaimRow({ claim }) {
  const vc = VERDICT_COLORS[claim.verdict] || VERDICT_COLORS.unverifiable;
  return (
    <div style={{
      padding: "10px 12px", borderRadius: 10, marginBottom: 8,
      background: vc.bg, border: `1px solid ${vc.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20,
          background: `${vc.color}20`, border: `1px solid ${vc.color}40`,
          color: vc.color, letterSpacing: "0.07em", fontFamily: "'DM Mono',monospace",
        }}>{claim.verdict?.toUpperCase()}</span>
        <span style={{ fontSize: 11, color: `${vc.color}80`, fontFamily: "'DM Mono',monospace" }}>
          {Math.round((claim.confidence ?? 0) * 100)}%
        </span>
      </div>
      <p style={{ fontSize: 12, color: "#d8dce8", margin: 0, lineHeight: 1.55 }}>
        <TypewriterText text={claim.claim} speed={10} cursor={false} style={{ color: "#d8dce8" }} />
      </p>
    </div>
  );
}

function SourcePanel({ results, label, accuracy, side }) {
  if (!results) return null;
  const borderColor = side === "a" ? "rgba(99,179,237,0.2)" : "rgba(168,85,247,0.2)";
  const accentColor = side === "a" ? "#63b3ed" : "#a78bfa";
  return (
    <div style={{
      flex: 1, background: "rgba(255,255,255,0.04)",
      border: `1px solid ${borderColor}`,
      borderRadius: 14, overflow: "hidden", backdropFilter: "blur(12px)",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px",
        borderBottom: `1px solid ${borderColor}`,
        background: `${accentColor}08`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif" }}>
            {label}
          </span>
          <span style={{ fontSize: 10, color: "rgba(200,210,240,0.4)", fontFamily: "'DM Mono',monospace" }}>
            {results.length} claims
          </span>
        </div>
        <AccuracyBadge value={accuracy} label="accuracy" />
      </div>

      {/* Claims */}
      <div style={{ padding: "14px 14px" }}>
        {results.map((c, i) => <ClaimRow key={i} claim={c} />)}
      </div>
    </div>
  );
}

function ComparisonAnalysis({ analysis, labelA, labelB }) {
  if (!analysis) return null;
  const winner = analysis.credibility_winner;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Credibility winner banner */}
      {winner && winner !== "equal" && (
        <div style={{
          padding: "14px 18px",
          background: winner === "a" ? "rgba(99,179,237,0.08)" : "rgba(168,85,247,0.08)",
          border: `1px solid ${winner === "a" ? "rgba(99,179,237,0.25)" : "rgba(168,85,247,0.25)"}`,
          borderRadius: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 14 }}>🏆</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: winner === "a" ? "#63b3ed" : "#a78bfa" }}>
              {winner === "a" ? labelA : labelB} is more credible
            </span>
          </div>
          <p style={{ fontSize: 12, color: "rgba(200,210,240,0.65)", margin: 0, lineHeight: 1.6 }}>
            {analysis.credibility_reason}
          </p>
        </div>
      )}

      {/* Agreements */}
      {analysis.agreements?.length > 0 && (
        <div style={{ padding: "14px 16px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Mono',monospace" }}>
            ✓ Both sources agree ({analysis.agreements.length})
          </p>
          {analysis.agreements.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: "#4ade80", fontSize: 12, flexShrink: 0 }}>✓</span>
              <p style={{ margin: 0, fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>{a.claim}</p>
            </div>
          ))}
        </div>
      )}

      {/* Contradictions */}
      {analysis.contradictions?.length > 0 && (
        <div style={{ padding: "14px 16px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#f87171", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10, fontFamily: "'DM Mono',monospace" }}>
            ⚡ Direct contradictions ({analysis.contradictions.length})
          </p>
          {analysis.contradictions.map((c, i) => (
            <div key={i} style={{ marginBottom: 10, padding: "10px 12px", background: "rgba(248,113,113,0.08)", borderRadius: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(200,210,240,0.5)", marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>
                {c.topic}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ padding: "7px 10px", background: "rgba(99,179,237,0.08)", borderRadius: 7, border: "1px solid rgba(99,179,237,0.2)" }}>
                  <p style={{ fontSize: 9, color: "#63b3ed", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>SOURCE A</p>
                  <p style={{ fontSize: 11, color: "#bfdbfe", margin: 0, lineHeight: 1.5 }}>{c.claim_a}</p>
                </div>
                <div style={{ padding: "7px 10px", background: "rgba(168,85,247,0.08)", borderRadius: 7, border: "1px solid rgba(168,85,247,0.2)" }}>
                  <p style={{ fontSize: 9, color: "#a78bfa", fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>SOURCE B</p>
                  <p style={{ fontSize: 11, color: "#ddd6fe", margin: 0, lineHeight: 1.5 }}>{c.claim_b}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unique claims */}
      {(analysis.unique_to_a?.length > 0 || analysis.unique_to_b?.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {analysis.unique_to_a?.length > 0 && (
            <div style={{ padding: "12px 14px", background: "rgba(99,179,237,0.06)", border: "1px solid rgba(99,179,237,0.15)", borderRadius: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#63b3ed", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>
                Only in {labelA}
              </p>
              {analysis.unique_to_a.map((c, i) => (
                <p key={i} style={{ fontSize: 11, color: "#93c5fd", margin: "0 0 4px", lineHeight: 1.5 }}>• {c}</p>
              ))}
            </div>
          )}
          {analysis.unique_to_b?.length > 0 && (
            <div style={{ padding: "12px 14px", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>
                Only in {labelB}
              </p>
              {analysis.unique_to_b.map((c, i) => (
                <p key={i} style={{ fontSize: 11, color: "#c4b5fd", margin: "0 0 4px", lineHeight: 1.5 }}>• {c}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bias comparison */}
      {analysis.bias_comparison && (
        <div style={{ padding: "14px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(200,210,240,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>
            Bias Analysis
          </p>
          <p style={{ fontSize: 12, color: "rgba(200,210,240,0.7)", margin: 0, lineHeight: 1.7 }}>
            <TypewriterText text={analysis.bias_comparison} speed={8} cursor={false} style={{ color: "rgba(200,210,240,0.7)" }} />
          </p>
        </div>
      )}
    </div>
  );
}

export default function CompareMode({ onBack }) {
  const [inputA, setInputA]   = useState({ value: "", type: "text", label: "Source A" });
  const [inputB, setInputB]   = useState({ value: "", type: "text", label: "Source B" });
  const [stage, setStage]     = useState("idle");
  const [logs, setLogs]       = useState([]);
  const [comparison, setComp] = useState(null);
  const ctrlRef               = useRef(null);

  const isRunning  = stage === "running";
  const isComplete = stage === "complete";

  const run = async () => {
    if (!inputA.value.trim() || !inputB.value.trim()) return;
    setStage("running"); setLogs([]); setComp(null);

    ctrlRef.current = new AbortController();
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input_a: inputA.value.trim(), type_a: inputA.type, label_a: inputA.label,
          input_b: inputB.value.trim(), type_b: inputB.type, label_b: inputB.label,
        }),
        signal: ctrlRef.current.signal,
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
          if (payload === "[DONE]") { setStage("complete"); return; }
          try {
            const data = JSON.parse(payload);
            if (data.message) setLogs(p => [...p, data.message]);
            if (data.comparison) setComp(data.comparison);
            if (data.stage === "complete") setStage("complete");
          } catch (_) {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") { setStage("error"); setLogs(p => [...p, "Error: " + e.message]); }
    }
  };

  const InputField = ({ state, onChange, placeholder, side }) => {
    const accentColor = side === "a" ? "#63b3ed" : "#a78bfa";
    return (
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={state.label}
            onChange={e => onChange({ ...state, label: e.target.value })}
            placeholder={side === "a" ? "Source A name" : "Source B name"}
            style={{
              flex: 1, padding: "6px 10px", borderRadius: 7, fontSize: 12,
              border: `1px solid ${accentColor}40`, background: `${accentColor}08`,
              color: accentColor, fontFamily: "'DM Mono',monospace", outline: "none",
            }}
          />
          {["text","url"].map(t => (
            <button key={t} onClick={() => onChange({ ...state, type: t })} style={{
              padding: "5px 12px", borderRadius: 7, fontSize: 11, cursor: "pointer",
              border: `1px solid ${state.type === t ? accentColor : "rgba(255,255,255,0.1)"}`,
              background: state.type === t ? `${accentColor}18` : "transparent",
              color: state.type === t ? accentColor : "rgba(200,210,240,0.4)",
              fontFamily: "'Inter',sans-serif",
            }}>{t}</button>
          ))}
        </div>
        {state.type === "text" ? (
          <textarea
            value={state.value}
            onChange={e => onChange({ ...state, value: e.target.value })}
            placeholder={placeholder}
            rows={4}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: `1px solid ${state.value ? accentColor + "40" : "rgba(255,255,255,0.1)"}`,
              background: "rgba(255,255,255,0.04)", color: "#e8eaf0",
              fontSize: 13, lineHeight: 1.6, fontFamily: "'Inter',sans-serif",
              resize: "none", outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = accentColor + "60"}
            onBlur={e  => e.target.style.borderColor = state.value ? accentColor + "40" : "rgba(255,255,255,0.1)"}
          />
        ) : (
          <input
            value={state.value}
            onChange={e => onChange({ ...state, value: e.target.value })}
            placeholder="https://…"
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: `1px solid rgba(255,255,255,0.1)`,
              background: "rgba(255,255,255,0.04)", color: "#e8eaf0",
              fontSize: 13, fontFamily: "'DM Mono',monospace",
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = accentColor + "60"}
            onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* Aurora bg */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "#080c14" }}>
        <div style={{ position: "absolute", width: 600, height: 600, top: "-100px", left: "-100px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,179,237,0.1) 0%, transparent 70%)" }}/>
        <div style={{ position: "absolute", width: 600, height: 600, top: "-100px", right: "-100px", borderRadius: "50%", background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)" }}/>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize: "48px 48px" }}/>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap'); @keyframes spin{to{transform:rotate(360deg)}} @keyframes slide-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}} textarea::placeholder,input::placeholder{color:rgba(255,255,255,0.18)}`}</style>

      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(8,12,20,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onBack} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(200,210,240,0.7)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>← Back</button>
            <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)" }}/>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif", letterSpacing: "-0.02em" }}>Compare Sources</span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(99,179,237,0.1)", border: "1px solid rgba(99,179,237,0.25)", color: "#63b3ed", fontFamily: "'DM Mono',monospace" }}>BETA</span>
          </div>
          <span style={{ fontSize: 11, color: "rgba(200,210,240,0.3)", fontFamily: "'DM Mono',monospace" }}>Side-by-side fact analysis</span>
        </div>
      </header>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "28px 28px 80px" }}>

        {/* Input section */}
        {!isComplete && (
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 24, backdropFilter: "blur(12px)", marginBottom: 20, animation: "slide-up 0.25s ease" }}>
            <p style={{ fontSize: 13, color: "rgba(200,210,240,0.5)", fontFamily: "'DM Mono',monospace", marginBottom: 18 }}>
              Enter two sources — articles, URLs, or text — to compare their factual accuracy head-to-head.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 48px 1fr", gap: 16, alignItems: "start" }}>
              <InputField state={inputA} onChange={setInputA} placeholder="Paste Source A text or article…" side="a" />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 50 }}>
                <span style={{ fontSize: 18, color: "rgba(200,210,240,0.2)" }}>⟷</span>
              </div>
              <InputField state={inputB} onChange={setInputB} placeholder="Paste Source B text or article…" side="b" />
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
              <button
                onClick={run}
                disabled={!inputA.value.trim() || !inputB.value.trim() || isRunning}
                style={{
                  padding: "12px 36px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                  background: inputA.value.trim() && inputB.value.trim() && !isRunning ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.08)",
                  color: inputA.value.trim() && inputB.value.trim() && !isRunning ? "#080c14" : "rgba(255,255,255,0.2)",
                  border: "none", cursor: inputA.value.trim() && inputB.value.trim() && !isRunning ? "pointer" : "not-allowed",
                  fontFamily: "'Inter',sans-serif", display: "flex", alignItems: "center", gap: 10,
                  transition: "all 0.2s",
                }}
              >
                {isRunning ? <><span style={{ animation: "spin 0.9s linear infinite", display: "inline-block" }}>◌</span> Comparing…</> : "Compare Sources →"}
              </button>
            </div>
          </div>
        )}

        {/* Running state */}
        {isRunning && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", animation: "slide-up 0.25s ease" }}>
            <div style={{ position: "relative", width: 64, height: 64, marginBottom: 20 }}>
              <svg width="64" height="64" style={{ animation: "spin 1.2s linear infinite" }}>
                <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(99,179,237,0.15)" strokeWidth="4"/>
                <circle cx="32" cy="32" r="27" fill="none" stroke="#63b3ed" strokeWidth="4" strokeDasharray="170" strokeDashoffset="128" strokeLinecap="round"/>
              </svg>
              <svg width="64" height="64" style={{ position: "absolute", inset: 0, animation: "spin 1.8s linear infinite reverse" }}>
                <circle cx="32" cy="32" r="20" fill="none" stroke="#a78bfa" strokeWidth="3" strokeDasharray="90" strokeDashoffset="68" strokeLinecap="round"/>
              </svg>
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif", marginBottom: 8 }}>
              {STAGES[logs.length > 0 ? "comparing" : "fetching"] || "Analyzing…"}
            </p>
            {logs.length > 0 && (
              <p style={{ fontSize: 11, color: "rgba(147,210,255,0.5)", fontFamily: "'DM Mono',monospace", maxWidth: 380, textAlign: "center" }}>
                {logs[logs.length - 1]}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {isComplete && comparison && (
          <div style={{ animation: "slide-up 0.3s ease" }}>
            {/* Back / re-run bar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <button onClick={() => { setStage("idle"); setComp(null); setLogs([]); }} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(200,210,240,0.65)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>← New comparison</button>
              <button onClick={run} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "rgba(200,210,240,0.65)", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>↻ Re-run</button>
            </div>

            {/* Side by side claims */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <SourcePanel results={comparison.resultsA} label={comparison.labelA} accuracy={comparison.accuracyA} side="a" />
              <SourcePanel results={comparison.resultsB} label={comparison.labelB} accuracy={comparison.accuracyB} side="b" />
            </div>

            {/* Cross-analysis */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 16, padding: 24, backdropFilter: "blur(12px)" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Syne',sans-serif", marginBottom: 16 }}>
                Cross-Source Analysis
              </p>
              <ComparisonAnalysis analysis={comparison.analysis} labelA={comparison.labelA} labelB={comparison.labelB} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
