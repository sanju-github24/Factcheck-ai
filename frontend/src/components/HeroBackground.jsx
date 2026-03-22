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
  { text: "First iPhone — June 2007",   verdict: "true",    x: 7,  y: 16 },
  { text: "Moon landing was faked",      verdict: "false",   x: 75, y: 11 },
  { text: "India landed on Moon 2023",   verdict: "true",    x: 83, y: 60 },
  { text: "Humans use 10% of brain",     verdict: "false",   x: 5,  y: 70 },
  { text: "Amazon absorbs more CO₂",     verdict: "partial", x: 61, y: 79 },
  { text: "Nvidia crossed $3T — 2024",   verdict: "true",    x: 73, y: 34 },
  { text: "mRNA vaccines alter DNA",     verdict: "false",   x: 17, y: 49 },
  { text: "CO₂ levels rising globally",  verdict: "true",    x: 41, y: 87 },
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

export default function HeroBackground({ onRun, isRunning, onRestore, onCompare }) {
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

      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.85 }}/>

      {/* ── Floating claim pills ── */}
      {FLOATING_CLAIMS.map((fc, i) => {
        const v   = VC[fc.verdict];
        const act = activeNode === i;
        return (
          <div key={i} style={{
            position:"absolute", left:`${fc.x}%`, top:`${fc.y}%`,
            transform:"translate(-50%,-50%)",
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

        <MultiInputPanel onRun={onRun} isRunning={isRunning} />

        {/* Recent checks */}
        <RecentChecks onRestore={onRestore} />

        {/* Compare mode button */}
        <button onClick={onCompare} style={{
          marginTop: 16,
          padding: "9px 22px", borderRadius: 10,
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
