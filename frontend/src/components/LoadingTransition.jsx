import { useEffect, useState } from "react";
import TypewriterText from "./TypewriterText";

const STAGE_LABELS = [
  { key: "extracting", text: "Extracting Claims",    sub: "Decomposing text into atomic facts" },
  { key: "searching",  text: "Searching Evidence",   sub: "Querying live web sources via Tavily" },
  { key: "verifying",  text: "Verifying with Gemini", sub: "Grounding verdicts in retrieved evidence" },
  { key: "complete",   text: "Report Ready",          sub: "Analysis complete" },
];

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  angle: (i / 28) * 360,
  dist:  52 + (i % 3) * 18,
  size:  1.2 + (i % 4) * 0.5,
  speed: 0.6 + (i % 5) * 0.22,
  phase: (i / 28) * Math.PI * 2,
}));

const VERDICT_DOTS = [
  { label: "TRUE",    color: "#4ade80", angle: -60,  r: 108 },
  { label: "FALSE",   color: "#f87171", angle: 60,   r: 108 },
  { label: "PARTIAL", color: "#fbbf24", angle: 180,  r: 108 },
  { label: "?",       color: "#94a3b8", angle: 300,  r: 108 },
];

export default function LoadingTransition({ stage, logs, stageIndex }) {
  const [tick, setTick]         = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [pulsing, setPulsing]   = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 40);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (logs.length > 0) {
      setPulsing(true);
      const t = setTimeout(() => setPulsing(false), 600);
      return () => clearTimeout(t);
    }
  }, [logs.length]);

  const t      = tick * 0.022;
  const active = STAGE_LABELS.findIndex(s => s.key === stage);
  const info   = STAGE_LABELS[active] || STAGE_LABELS[0];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "calc(100vh - 160px)",
      padding: "40px 24px",
    }}>

      {/* ── Main orb ── */}
      <div style={{ position: "relative", width: 280, height: 280, marginBottom: 48 }}>

        {/* Outer verdict orbit dots */}
        {VERDICT_DOTS.map((dot, i) => {
          const rad   = (dot.angle * Math.PI) / 180 + t * (i % 2 === 0 ? 0.18 : -0.14);
          const ox    = Math.cos(rad) * dot.r;
          const oy    = Math.sin(rad) * dot.r;
          const glow  = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 1.2);
          const scale = 1 + 0.25 * glow;
          return (
            <div key={i} style={{
              position: "absolute",
              left: 140 + ox - 18,
              top:  140 + oy - 18,
              width: 36, height: 36,
              borderRadius: "50%",
              background: `${dot.color}18`,
              border: `1px solid ${dot.color}${Math.round(40 + glow * 80).toString(16).padStart(2,"0")}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: `scale(${scale})`,
              transition: "transform 0.1s",
              boxShadow: `0 0 ${8 + glow * 14}px ${dot.color}44`,
            }}>
              <span style={{
                fontSize: 8, fontWeight: 800, color: dot.color,
                fontFamily: "'DM Mono',monospace", letterSpacing: "0.04em",
              }}>{dot.label}</span>
            </div>
          );
        })}

        {/* Particle ring */}
        {PARTICLES.map(p => {
          const rad   = (p.angle * Math.PI / 180) + t * p.speed * 0.3;
          const pulse = 0.4 + 0.6 * Math.sin(t * 1.8 + p.phase);
          const px    = Math.cos(rad) * p.dist;
          const py    = Math.sin(rad) * p.dist;
          return (
            <div key={p.id} style={{
              position: "absolute",
              left: 140 + px - p.size / 2,
              top:  140 + py - p.size / 2,
              width: p.size, height: p.size,
              borderRadius: "50%",
              background: `hsla(${200 + p.id * 6},80%,70%,${0.2 + pulse * 0.5})`,
            }}/>
          );
        })}

        {/* Rotating arc ring */}
        <svg style={{
          position: "absolute", inset: 0, width: 280, height: 280,
          animation: "none",
        }}>
          {/* Static faint circle */}
          <circle cx={140} cy={140} r={68} fill="none"
            stroke="rgba(255,255,255,0.05)" strokeWidth={1}/>

          {/* Rotating progress arc */}
          {[0, 1, 2].map(i => {
            const offset = (i / 3) * Math.PI * 2;
            const arcLen = 80 + 60 * Math.sin(t * 0.7 + i);
            const circ   = 2 * Math.PI * 68;
            const gap    = circ - arcLen;
            const rot    = t * (i % 2 === 0 ? 1 : -0.7) * 50 + offset * 60;
            return (
              <circle key={i} cx={140} cy={140} r={68} fill="none"
                stroke={`hsla(${200 + i * 40},80%,72%,${0.25 + i * 0.12})`}
                strokeWidth={1.5 - i * 0.3}
                strokeDasharray={`${arcLen} ${gap}`}
                strokeLinecap="round"
                transform={`rotate(${rot} 140 140)`}
              />
            );
          })}

          {/* Inner ring — opposite direction */}
          <circle cx={140} cy={140} r={52} fill="none"
            stroke="rgba(99,179,237,0.08)" strokeWidth={0.8}/>
          {[0,1].map(i => {
            const arcLen = 40 + 30 * Math.sin(t * 1.1 + i * 2);
            const circ   = 2 * Math.PI * 52;
            const rot    = -t * 65 + i * 180;
            return (
              <circle key={i} cx={140} cy={140} r={52} fill="none"
                stroke={`rgba(147,210,255,${0.18 + i * 0.1})`}
                strokeWidth={1}
                strokeDasharray={`${arcLen} ${circ - arcLen}`}
                strokeLinecap="round"
                transform={`rotate(${rot} 140 140)`}
              />
            );
          })}
        </svg>

        {/* Center logo orb */}
        <div style={{
          position: "absolute",
          left: 140 - 44, top: 140 - 44,
          width: 88, height: 88, borderRadius: 22,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `
            0 0 ${20 + 12 * Math.sin(t * 1.2)}px rgba(99,179,237,0.2),
            0 0 ${40 + 20 * Math.sin(t * 0.9)}px rgba(99,179,237,0.08),
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
          transform: `scale(${pulsing ? 1.06 : 1})`,
          transition: "transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.1s",
        }}>
          <span style={{
            fontSize: 36, fontWeight: 800, color: "#fff",
            fontFamily: "'Syne',sans-serif", letterSpacing: "-0.04em",
            lineHeight: 1, userSelect: "none",
          }}>F</span>
        </div>

        {/* Scan line sweeping across orb */}
        <div style={{
          position: "absolute",
          left: 140 - 44, top: 140 - 44,
          width: 88, height: 88, borderRadius: 22,
          overflow: "hidden", pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute",
            left: 0, right: 0,
            height: 2,
            background: "linear-gradient(90deg, transparent, rgba(99,179,237,0.6), transparent)",
            top: `${((Math.sin(t * 0.8) * 0.5 + 0.5) * 100).toFixed(1)}%`,
            transition: "top 0.04s linear",
          }}/>
        </div>

      </div>

      {/* ── Stage indicator ── */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        gap: 8, marginBottom: 36,
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.35s ease, transform 0.35s ease",
      }}>
        <h2 style={{
          fontSize: 22, fontWeight: 800, color: "#fff",
          fontFamily: "'Syne',sans-serif", letterSpacing: "-0.03em",
          margin: 0, textAlign: "center",
        }}>{info.text}</h2>
        <p style={{
          fontSize: 12, color: "rgba(255,255,255,0.35)",
          fontFamily: "'DM Mono',monospace", margin: 0, textAlign: "center",
        }}>{info.sub}</p>
      </div>

      {/* ── Step pills ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 36 }}>
        {STAGE_LABELS.slice(0, 3).map((s, i) => {
          const done   = i < stageIndex;
          const isNow  = i === stageIndex;
          const color  = done ? "#4ade80" : isNow ? "#63b3ed" : "rgba(255,255,255,0.15)";
          const bg     = done ? "rgba(74,222,128,0.12)" : isNow ? "rgba(99,179,237,0.12)" : "rgba(255,255,255,0.03)";
          const border = done ? "rgba(74,222,128,0.35)" : isNow ? "rgba(99,179,237,0.4)" : "rgba(255,255,255,0.08)";
          return (
            <div key={s.key} style={{
              padding: "5px 16px", borderRadius: 20, fontSize: 11,
              fontFamily: "'DM Mono',monospace", letterSpacing: "0.05em",
              background: bg, border: `1px solid ${border}`, color,
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.4s ease",
            }}>
              {done && <span style={{ fontSize: 10 }}>✓</span>}
              {isNow && (
                <span style={{
                  width: 5, height: 5, borderRadius: "50%", background: "#63b3ed",
                  display: "inline-block",
                  boxShadow: "0 0 6px #63b3ed",
                  animation: "pulse-live 1.2s ease-in-out infinite",
                }}/>
              )}
              {s.text.split(" ")[0]}
            </div>
          );
        })}
      </div>

      {/* ── Live log line ── */}
      {logs.length > 0 && (
        <div style={{
          maxWidth: 480, padding: "10px 18px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 10, backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
            background: "#63b3ed",
            boxShadow: "0 0 8px #63b3ed",
            animation: "pulse-live 1s ease-in-out infinite",
          }}/>
          <p style={{
            fontSize: 11, color: "rgba(147,210,255,0.6)",
            fontFamily: "'DM Mono',monospace", margin: 0,
            overflow: "hidden", flex: 1,
          }}>
            <TypewriterText
              key={logs.length}
              text={logs[logs.length - 1].msg}
              speed={20}
              delay={0}
              cursor={true}
              style={{ fontFamily: "'DM Mono',monospace" }}
            />
          </p>
        </div>
      )}

      <style>{`
        @keyframes pulse-live {
          0%,100% { opacity:1; transform:scale(1); }
          50%      { opacity:0.4; transform:scale(0.7); }
        }
      `}</style>
    </div>
  );
}
