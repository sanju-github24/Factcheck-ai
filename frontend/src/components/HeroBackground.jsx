import { useEffect, useRef, useState } from "react";
import TypewriterText from "./TypewriterText";
import RecentChecks   from "./RecentChecks";
import MultiInputPanel from "./MultiInputPanel";

const DEMOS = [
  { label: "Tech facts",    text: "OpenAI was founded in 2015 by Elon Musk and Sam Altman with a $1 billion commitment. GPT-4 has 1.76 trillion parameters. Apple became the world's first trillion-dollar company in 2018. The first iPhone was released in June 2007." },
  { label: "Climate",      text: "Global temperatures have risen by 1.5°C above pre-industrial levels as of 2024. The Amazon rainforest now produces more CO2 than it absorbs. Electric vehicles account for over 50% of all new car sales globally." },
  { label: "Health myths", text: "Humans only use 10% of their brains. Drinking 8 glasses of water per day is a scientifically proven daily requirement. Vitamin C megadoses cure the common cold. The COVID-19 mRNA vaccines alter human DNA." },
];

const FLOATING_CLAIMS = [
  // Left column — spaced vertically, safe from edges
  { text: "First iPhone — June 2007",   verdict: "true",    x: 10, y: 18 },
  { text: "mRNA vaccines alter DNA",     verdict: "false",   x: 11, y: 38 },
  { text: "Humans use 10% of brain",     verdict: "false",   x: 9,  y: 58 },
  { text: "CO₂ levels rising globally",  verdict: "true",    x: 12, y: 78 },
  // Right column — spaced vertically, safe from edges
  { text: "Moon landing was faked",      verdict: "false",   x: 82, y: 15 },
  { text: "Nvidia crossed $3T — 2024",   verdict: "true",    x: 80, y: 35 },
  { text: "India landed on Moon 2023",   verdict: "true",    x: 83, y: 55 },
  { text: "Amazon absorbs more CO₂",     verdict: "partial", x: 79, y: 75 },
];

const VC = {
  true:    { dot: "#4ade80", pill: "rgba(74,222,128,0.12)",  pillBorder: "rgba(74,222,128,0.4)",  pillText: "#86efac", tag: "TRUE",    glow: "rgba(74,222,128,0.3)"  },
  false:   { dot: "#f87171", pill: "rgba(248,113,113,0.12)", pillBorder: "rgba(248,113,113,0.4)", pillText: "#fca5a5", tag: "FALSE",   glow: "rgba(248,113,113,0.3)" },
  partial: { dot: "#fbbf24", pill: "rgba(251,191,36,0.12)",  pillBorder: "rgba(251,191,36,0.4)",  pillText: "#fde68a", tag: "PARTIAL", glow: "rgba(251,191,36,0.3)"  },
};

const PHRASES = [
  { line1: "Verify any claim.",  line2: "Instantly."            },
  { line1: "Truth or fiction.",  line2: "We decide."            },
  { line1: "Facts over noise.",  line2: "Always."               },
  { line1: "Every claim.",       line2: "Verified."             },
  { line1: "Stop the spread.",   line2: "Of misinformation."    },
];

const DOTS_ARR = ["", ".", "..", "..."];

// ── HeroInputPanel ──────────────────────────────────────────────────────────
function HeroInputPanel({ onRun, isRunning, onDocVerify }) {
  // Web ON by default for text/URL mode; toggled OFF when a file is loaded
  const [text, setText]         = useState("");
  const [webOn, setWeb]         = useState(true);   // default ON for text/URL
  const [fileName, setFileName] = useState("");
  const [docText, setDocText]   = useState("");
  const [extracting, setExtr]   = useState(false);
  const fileRef                 = useRef(null);
  const hasFile                 = !!fileName;

  // Extract text from any uploaded file
  const handleFile = async (f) => {
    setFileName(f.name);
    setExtr(true);
    setText("");
    setWeb(false);   // default web OFF when a file is uploaded
    const name = f.name.toLowerCase();
    let extracted = "";
    if (name.endsWith(".pdf")) {
      extracted = await new Promise(res => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            if (!window.pdfjsLib) {
              await new Promise((ok, rej) => {
                const s = document.createElement("script");
                s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
                s.onload = ok; s.onerror = rej; document.head.appendChild(s);
              });
              window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            }
            const pdf = await window.pdfjsLib.getDocument({ data: e.target.result }).promise;
            let t = "";
            for (let p = 1; p <= Math.min(pdf.numPages, 15); p++) {
              const pg = await pdf.getPage(p);
              const content = await pg.getTextContent();
              t += content.items.map(i => i.str).join(" ") + "\n\n";
            }
            res(t.trim());
          } catch { res(""); }
        };
        reader.readAsArrayBuffer(f);
      });
    } else {
      extracted = await f.text().catch(() => "");
    }
    setDocText(extracted);
    setExtr(false);
  };

  const removeFile = () => {
    setFileName(""); setDocText(""); setText(""); setWeb(true);
  };

  const handleRun = () => {
    if (hasFile) {
      // File mode — text field is the CLAIM QUERY
      if (!text.trim()) return;
      // Pass structured doc params; web flag determines whether web search runs
      onRun(text.trim(), "text", {
        webEnabled: webOn,
        docText: docText,
        docQuery: text.trim(),
      });
    } else {
      // No file — text field is the CONTENT to fact-check; web always on
      if (!text.trim()) return;
      onRun(text.trim(), "text", { webEnabled: true });
    }
  };

  const canSubmit = hasFile ? (!!text.trim() && !extracting) : !!text.trim();

  return (
    <div style={{ width: "100%", maxWidth: 640 }}>

      {/* Main card */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${hasFile ? "rgba(99,179,237,0.35)" : "rgba(255,255,255,0.12)"}`,
        borderRadius: 16, overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
        transition: "border-color 0.2s",
      }}>

        {/* File banner — shown when file is loaded */}
        {hasFile && (
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(74,222,128,0.06)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontSize: 16 }}>📄</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, color: "#4ade80", margin: 0,
                fontFamily: "'DM Mono',monospace" }}>
                {extracting ? "⏳ Extracting text…" : `✓ ${fileName}`}
              </p>
              {!extracting && docText && (
                <p style={{ fontSize: 10, color: "rgba(74,222,128,0.5)", margin: 0,
                  fontFamily: "'DM Mono',monospace" }}>
                  {docText.length.toLocaleString()} characters loaded
                </p>
              )}
            </div>
            <button onClick={removeFile} style={{
              fontSize: 10, padding: "3px 9px", borderRadius: 6,
              background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)",
              color: "#f87171", cursor: "pointer",
            }}>✕ Remove</button>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleRun(); }}
          placeholder={
            hasFile
              ? "Enter a claim to verify against this document…"
              : "Paste text, article, claims, or a URL to fact-check…"
          }
          rows={hasFile ? 3 : 5}
          style={{
            width: "100%", padding: "16px 18px", border: "none",
            resize: "none", background: "transparent", color: "#e8eaf0",
            fontSize: 14, fontFamily: "'Inter',sans-serif",
            lineHeight: 1.7, outline: "none", boxSizing: "border-box",
            display: "block",
          }}
        />

        {/* Toolbar */}
        <div style={{
          padding: "10px 14px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
        }}>

          {/* Upload file button */}
          {!hasFile && (
            <>
              <button onClick={() => fileRef.current?.click()}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(200,210,240,0.55)", fontSize: 11,
                  fontFamily: "'DM Mono',monospace", transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(99,179,237,0.4)"; e.currentTarget.style.color = "#63b3ed"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(200,210,240,0.55)"; }}
              >📄 Upload File</button>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md,.csv"
                style={{ display: "none" }}
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            </>
          )}

          {/* Web Search toggle — always visible, default OFF */}
          <div onClick={() => setWeb(w => !w)} style={{
            display: "flex", alignItems: "center", gap: 7, cursor: "pointer",
            padding: "6px 12px", borderRadius: 10, userSelect: "none",
            background: webOn ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${webOn ? "rgba(251,191,36,0.45)" : "rgba(255,255,255,0.1)"}`,
            transition: "all 0.2s",
          }}>
            {/* Toggle pill */}
            <div style={{
              width: 32, height: 18, borderRadius: 9, flexShrink: 0,
              background: webOn ? "#fbbf24" : "rgba(255,255,255,0.15)",
              position: "relative", transition: "background 0.2s",
            }}>
              <div style={{
                position: "absolute", top: 2,
                left: webOn ? 16 : 2,
                width: 14, height: 14, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
              }}/>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: webOn ? "#fbbf24" : "rgba(200,210,240,0.4)",
              fontFamily: "'DM Mono',monospace", transition: "color 0.2s",
            }}>🌐 Web {webOn ? "ON" : "OFF"}</span>
          </div>

          <div style={{ flex: 1 }}/>

          {/* Submit button */}
          <button onClick={handleRun} disabled={!canSubmit || isRunning} style={{
            padding: "9px 22px", borderRadius: 10, fontSize: 13, fontWeight: 700,
            cursor: canSubmit && !isRunning ? "pointer" : "not-allowed",
            background: canSubmit && !isRunning
              ? "linear-gradient(135deg,rgba(99,179,237,0.35),rgba(167,139,250,0.35))"
              : "rgba(255,255,255,0.05)",
            border: `1px solid ${canSubmit && !isRunning ? "rgba(99,179,237,0.6)" : "rgba(255,255,255,0.1)"}`,
            color: canSubmit && !isRunning ? "#fff" : "rgba(255,255,255,0.25)",
            fontFamily: "'Inter',sans-serif",
            display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.15s",
          }}>
            {isRunning
              ? <><span style={{ animation: "spin 0.9s linear infinite", display: "inline-block" }}>◌</span> Verifying…</>
              : hasFile && !webOn ? "📄 Verify from Document"
              : hasFile && webOn  ? "📄+🌐 Verify Document + Web"
              : "✓ Verify Claims"
            }
          </button>
        </div>
      </div>

        {/* Hint text */}
      <p style={{
        fontSize: 10, color: "rgba(200,210,240,0.28)",
        textAlign: "center", marginTop: 8,
        fontFamily: "'DM Mono',monospace",
      }}>
        {hasFile && !webOn && "Document mode — answers from file only · Toggle Web ON to also search live sources"}
        {hasFile && webOn  && "Document + Web — verifies in document first, then cross-checks with Tavily"}
        {!hasFile          && "Web search ON · Paste text or URL · Upload any file · 100+ languages · ⌘↵ to submit"}
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}


export default function HeroBackground({ onRun, isRunning, onRestore, onCompare, onDocVerify }) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);

  // inputType/value now handled by MultiInputPanel
  const [activeNode, setActiveNode] = useState(-1);
  const [prevNode, setPrevNode]     = useState(-1);
  const [dotFrame, setDotFrame]     = useState(0);

  // Phrase rotation
  const [phraseIdx, setPhraseIdx]   = useState(0);
  const [phraseKey, setPhraseKey]   = useState(0);
  const [showPhrase, setShowPhrase] = useState(true);

  // ── Canvas particle network ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W, H, nodes = [], animId;

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
      nodes = Array.from({ length: 60 }, () => ({
        x:  Math.random() * W, y:  Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r:  Math.random() * 1.6 + 0.5,
        ph: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.009 + 0.004,
        hue: [210, 260, 180][Math.floor(Math.random() * 3)],
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.005;
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.ph += n.sp;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `hsla(${nodes[i].hue},80%,70%,${(1 - d/120) * 0.13})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      nodes.forEach(n => {
        const g = 0.5 + 0.5 * Math.sin(n.ph);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * (1 + 0.3*g), 0, Math.PI*2);
        ctx.fillStyle = `hsla(${n.hue},80%,72%,${0.18 + 0.22*g})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  // ── Floating pill cycle — starts after 1s, every 2.4s ──────────────────
  useEffect(() => {
    const start = setTimeout(() => {
      setActiveNode(0);
      const t = setInterval(() => {
        setActiveNode(i => {
          setPrevNode(i);
          return (i + 1) % FLOATING_CLAIMS.length;
        });
      }, 2400);
      return () => clearInterval(t);
    }, 1000);
    return () => clearTimeout(start);
  }, []);

  // ── Phrase rotation every 15s ───────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setShowPhrase(false);
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % PHRASES.length);
        setPhraseKey(k => k + 1);
        setShowPhrase(true);
      }, 500);
    }, 15000);
    return () => clearInterval(t);
  }, []);

  // ── Dot ticker while running ────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning) return;
    const t = setInterval(() => setDotFrame(f => (f + 1) % 4), 480);
    return () => clearInterval(t);
  }, [isRunning]);

  // submit handled by MultiInputPanel

  return (
    <div style={{ position:"relative", width:"100%", minHeight:"100vh", background:"#080c14", overflow:"hidden", display:"flex", flexDirection:"column" }}>

      {/* Aurora pools */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
        <div style={{ position:"absolute", width:700, height:700, top:"-180px", left:"-180px", borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)" }}/>
        <div style={{ position:"absolute", width:600, height:600, top:"-120px", right:"-120px", borderRadius:"50%", background:"radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 70%)" }}/>
        <div style={{ position:"absolute", width:900, height:600, top:"50%", left:"50%", transform:"translate(-50%,-52%)", borderRadius:"50%", background:"radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 65%)" }}/>
        <div style={{ position:"absolute", width:500, height:500, bottom:"-140px", left:"30%", borderRadius:"50%", background:"radial-gradient(circle, rgba(52,211,153,0.12) 0%, transparent 70%)" }}/>
      </div>

      {/* Subtle dot grid overlay */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
        opacity: 0.4,
      }}/>

      {/* Corner bracket decorations */}
      {[
        { top:16, left:16,   borderTop:"1.5px solid rgba(255,255,255,0.15)", borderLeft:"1.5px solid rgba(255,255,255,0.15)" },
        { top:16, right:16,  borderTop:"1.5px solid rgba(255,255,255,0.15)", borderRight:"1.5px solid rgba(255,255,255,0.15)" },
        { bottom:16, left:16,  borderBottom:"1.5px solid rgba(255,255,255,0.15)", borderLeft:"1.5px solid rgba(255,255,255,0.15)" },
        { bottom:16, right:16, borderBottom:"1.5px solid rgba(255,255,255,0.15)", borderRight:"1.5px solid rgba(255,255,255,0.15)" },
      ].map((s, i) => (
        <div key={i} style={{ position:"absolute", ...s, width:28, height:28, pointerEvents:"none", zIndex:1 }}/>
      ))}

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.85 }}/>

      {/* ── Floating claim pills ── */}
      {FLOATING_CLAIMS.map((fc, i) => {
        const v       = VC[fc.verdict];
        const act     = activeNode === i;
        // Left side pills anchor from left, right side from right edge
        const isRight = fc.x > 50;
        const xStyle  = isRight
          ? { right: `${100 - fc.x}%`, left: "auto" }
          : { left: `${fc.x}%` };
        return (
          <div key={i} style={{
            position:"absolute", ...xStyle, top:`${fc.y}%`,
            transform: isRight ? "translateY(-50%)" : "translateY(-50%)",
            zIndex:2, pointerEvents:"none",
            transition:"all 0.4s ease",
          }}>
            <div style={{
              display:"flex", alignItems:"center", gap:7,
              padding: act ? "6px 14px 6px 10px" : "5px 12px 5px 9px",
              background: act ? v.pill : "rgba(255,255,255,0.04)",
              border:`1px solid ${act ? v.pillBorder : "rgba(255,255,255,0.1)"}`,
              borderRadius:24,
              boxShadow: act ? `0 0 24px ${v.glow}, 0 0 48px ${v.glow.replace("0.3","0.12")}` : "none",
              backdropFilter:"blur(6px)",
              transition:"all 0.4s ease",
              whiteSpace:"nowrap",
              transform: act ? "scale(1.06)" : "scale(1)",
            }}>
              {/* Pulsing dot */}
              <div style={{
                width: act ? 8 : 6,
                height: act ? 8 : 6,
                borderRadius:"50%",
                background: act ? v.dot : "rgba(255,255,255,0.2)",
                boxShadow: act ? `0 0 10px ${v.dot}, 0 0 20px ${v.dot}` : "none",
                flexShrink:0,
                transition:"all 0.4s",
                animation: act ? "dot-pulse 1.2s ease-in-out infinite" : "none",
              }}/>

              {/* Text — typewriter when activating */}
              <span style={{
                fontSize:11, fontWeight: act ? 600 : 400,
                color: act ? v.pillText : "rgba(255,255,255,0.35)",
                fontFamily:"'DM Mono',monospace",
                letterSpacing:"0.02em",
                transition:"color 0.4s, font-weight 0.2s",
              }}>
                {act ? (
                  <TypewriterText
                    key={`pill-${i}-${activeNode}`}
                    text={fc.text}
                    speed={28}
                    delay={0}
                    cursor={false}
                    style={{ color: v.pillText, fontFamily:"'DM Mono',monospace" }}
                  />
                ) : fc.text}
              </span>

              {/* Verdict tag — appears with fade when active */}
              {act && (
                <span style={{
                  fontSize:9, fontWeight:800,
                  color: v.dot,
                  letterSpacing:"0.12em",
                  marginLeft:2,
                  padding:"2px 6px",
                  borderRadius:10,
                  background:`${v.dot}20`,
                  border:`1px solid ${v.dot}50`,
                  animation:"tag-appear 0.3s ease",
                }}>{v.tag}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* ── Main content ── */}
      <div style={{
        position:"relative", zIndex:10,
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        padding:"60px 24px", minHeight:"100vh",
      }}>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:11, marginBottom:32 }}>
          <div style={{
            width:42, height:42, borderRadius:11,
            background:"rgba(255,255,255,0.1)",
            border:"1px solid rgba(255,255,255,0.18)",
            backdropFilter:"blur(8px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#fff", fontWeight:800, fontSize:20,
            fontFamily:"'Syne',sans-serif",
          }}>F</div>
          <div>
            <div style={{ fontSize:20, fontWeight:800, color:"#fff", fontFamily:"'Syne',sans-serif", letterSpacing:"-0.03em", lineHeight:1 }}>
              FactCheck AI
            </div>
            <div style={{ fontSize:10, color:"rgba(200,210,240,0.6)", letterSpacing:"0.1em", marginTop:2, fontFamily:"'DM Mono',monospace" }}>
              GEMINI 2.5 FLASH LITE · TAVILY SEARCH
            </div>
          </div>
        </div>

        {/* ── Rotating headline — typewriter ── */}
        <div style={{
          textAlign:"center", marginBottom:12,
          opacity: showPhrase ? 1 : 0,
          transform: showPhrase ? "translateY(0)" : "translateY(-6px)",
          transition:"opacity 0.45s ease, transform 0.45s ease",
          minHeight:120,
          display:"flex", flexDirection:"column", justifyContent:"center",
        }}>
          <h1 style={{
            fontSize:"clamp(28px, 5.5vw, 58px)",
            fontWeight:800, letterSpacing:"-0.04em",
            lineHeight:1.1, margin:0,
            fontFamily:"'Syne',sans-serif",
            color:"#ffffff",
          }}>
            <TypewriterText
              key={`l1-${phraseKey}`}
              text={PHRASES[phraseIdx].line1}
              speed={52}
              delay={0}
              cursor={false}
              style={{ color:"#ffffff" }}
            />
            <br/>
            <TypewriterText
              key={`l2-${phraseKey}`}
              text={PHRASES[phraseIdx].line2}
              speed={52}
              delay={PHRASES[phraseIdx].line1.length * 56}
              cursor={true}
              style={{ color:"rgba(255,255,255,0.4)", fontWeight:400 }}
            />
          </h1>
        </div>

        {/* Subtitle */}
        <p style={{
          fontSize:13, color:"rgba(220,228,248,0.75)",
          textAlign:"center", maxWidth:420, lineHeight:1.7,
          marginBottom:36,
          fontFamily:"'DM Mono',monospace", letterSpacing:"0.01em",
        }}>
          Multi-agent pipeline · Real-time web evidence<br/>
          Grounded verdicts with citations
        </p>

        {/* ── Unified Input Panel ── */}
        <HeroInputPanel onRun={onRun} isRunning={isRunning} onDocVerify={onDocVerify} />

        {/* Recent checks */}
        <RecentChecks onRestore={onRestore} />

        {/* Compare button */}
        <button onClick={onCompare} style={{
          marginTop:14, padding: "9px 22px", borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(255,255,255,0.05)",
          color: "rgba(200,210,240,0.7)", fontSize: 12, fontWeight: 500,
          cursor: "pointer", fontFamily: "'Inter',sans-serif",
          display: "flex", alignItems: "center", gap: 8,
          transition: "all 0.15s", backdropFilter: "blur(8px)",
        }}
        onMouseEnter={e => { e.currentTarget.style.background="rgba(255,255,255,0.1)"; e.currentTarget.style.color="#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background="rgba(255,255,255,0.05)"; e.currentTarget.style.color="rgba(200,210,240,0.7)"; }}
        >
          <span style={{ fontSize:14 }}>⟷</span>
          Compare Two Sources
        </button>

        {/* Stats row */}
        <div style={{ display:"flex", gap:36, marginTop:40, paddingTop:24, borderTop:"1px solid rgba(255,255,255,0.1)" }}>
          {[
            { n:"3",         label:"AI Agents"    },
            { n:"Live",      label:"Web Evidence"  },
            { n:"4",         label:"Verdict Types" },
            { n:"Real-time", label:"SSE Stream"    },
          ].map(s => (
            <div key={s.n} style={{ textAlign:"center" }}>
              <div style={{ fontSize:16, fontWeight:800, color:"#f0f2ff", fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em" }}>{s.n}</div>
              <div style={{ fontSize:10, color:"rgba(200,210,240,0.55)", letterSpacing:"0.08em", marginTop:3, textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{s.label}</div>
            </div>
          ))}
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes dot-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.5; transform:scale(0.7); }
        }
        @keyframes tag-appear {
          from { opacity:0; transform:scale(0.8) translateX(-4px); }
          to   { opacity:1; transform:scale(1) translateX(0); }
        }
        textarea::placeholder { color: rgba(255,255,255,0.2); }
        input::placeholder    { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}