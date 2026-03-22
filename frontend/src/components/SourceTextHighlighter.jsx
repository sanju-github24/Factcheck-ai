import React, { useState, useMemo, useEffect, useRef } from "react";
import TypewriterText from "./TypewriterText";

const VERDICT_COLORS = {
  true:             "#4ade80",
  false:            "#f87171",
  "partially true": "#fbbf24",
  unverifiable:     "#94a3b8",
};

function findSegments(text, activeClaim) {
  if (!activeClaim) return [{ text, highlight: false }];
  const needle = (activeClaim.context?.trim() || activeClaim.claim?.trim() || "").slice(0, 120);
  if (needle.length < 8) return [{ text, highlight: false }];
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return [{ text, highlight: false }];
  return [
    { text: text.slice(0, idx),                   highlight: false },
    { text: text.slice(idx, idx + needle.length),  highlight: true  },
    { text: text.slice(idx + needle.length),       highlight: false },
  ];
}

function SourceTypewriter({ text, onDone }) {
  const [shownChars, setShownChars] = useState(0);
  const rafRef  = useRef(null);
  const lastRef = useRef(0);

  useEffect(() => {
    setShownChars(0);
    lastRef.current = 0;
    let idx = 0;
    const step = (ts) => {
      if (!lastRef.current) lastRef.current = ts;
      const elapsed = ts - lastRef.current;
      const toAdd = Math.floor(elapsed / 7);
      if (toAdd > 0 && idx < text.length) {
        idx = Math.min(idx + toAdd, text.length);
        setShownChars(idx);
        lastRef.current = ts;
      }
      if (idx < text.length) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [text]);

  return <span style={{ color: "#e8eaf0" }}>{text.slice(0, shownChars)}</span>;
}

export default function SourceTextHighlighter({ originalText, claims, activeClaim, onClaimHover }) {
  const [textReady, setTextReady]   = useState(false);
  const [prevActive, setPrevActive] = useState(null);
  const [highlightKey, setHighlightKey] = useState(0);

  useEffect(() => {
    if (activeClaim?.id !== prevActive?.id) {
      setHighlightKey(k => k + 1);
      setPrevActive(activeClaim);
      // no scroll — user stays where they are
    }
  }, [activeClaim]);

  const segments = useMemo(
    () => findSegments(originalText || "", activeClaim),
    [originalText, highlightKey]
  );

  if (!originalText || originalText.length < 20) return null;

  const activeColor = VERDICT_COLORS[activeClaim?.verdict] || "#fbbf24";

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 14, overflow: "hidden",
      backdropFilter: "blur(12px)",
    }}>

      {/* Header */}
      <div style={{
        padding: "12px 18px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#fff", margin: 0, fontFamily: "'Syne',sans-serif" }}>
            Source Text
          </p>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", margin: 0, fontFamily: "'DM Mono',monospace" }}>
            {activeClaim
              ? `Claim ${activeClaim.id} origin highlighted`
              : "Hover a claim to highlight its source sentence"}
          </p>
        </div>
        {activeClaim && (
          <span style={{
            fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
            background: `${activeColor}20`,
            border: `1px solid ${activeColor}50`,
            color: activeColor,
            fontFamily: "'DM Mono',monospace",
            letterSpacing: "0.06em",
          }}>
            {activeClaim.verdict?.toUpperCase()}
          </span>
        )}
      </div>

      {/* Text body — bright white readable text */}
      <div style={{
        padding: "16px 18px",
        fontSize: 13, lineHeight: 1.85,
        color: "#e8eaf0",         /* bright — fully readable */
        maxHeight: 240, overflowY: "auto",
        scrollbarWidth: "none",
        fontFamily: "'Inter',sans-serif",
        letterSpacing: "0.01em",
      }}>
        {!textReady ? (
          <SourceTypewriter text={originalText} onDone={() => setTextReady(true)} />
        ) : (
          segments.map((seg, i) =>
            seg.highlight ? (
              <mark key={`${highlightKey}-${i}`} style={{
                background: `${activeColor}25`,
                color: activeColor,
                borderRadius: 4,
                padding: "1px 4px",
                border: `1px solid ${activeColor}55`,
                fontWeight: 700,
                animation: "highlight-pulse 0.4s ease",
              }}>
                <TypewriterText
                  key={highlightKey}
                  text={seg.text}
                  speed={9}
                  delay={0}
                  cursor={false}
                  style={{ fontWeight: 700, color: activeColor }}
                />
              </mark>
            ) : (
              /* Non-highlighted: bright white */
              <span key={i} style={{ color: "#c8ccd8" }}>{seg.text}</span>
            )
          )
        )}
      </div>

      {/* Claim chips */}
      <div style={{
        padding: "10px 18px",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
      }}>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono',monospace", marginRight: 2 }}>
          claims:
        </span>
        {claims.map((c, i) => {
          const col   = VERDICT_COLORS[c.verdict] || "#94a3b8";
          const isAct = activeClaim?.id === c.id;
          return (
            <button
              key={i}
              onMouseEnter={() => onClaimHover?.(c)}
              onMouseLeave={() => onClaimHover?.(null)}
              onClick={() => onClaimHover?.(isAct ? null : c)}
              style={{
                padding: "3px 10px", borderRadius: 20, fontSize: 10,
                fontFamily: "'DM Mono',monospace", cursor: "pointer",
                background: isAct ? `${col}22` : "rgba(255,255,255,0.05)",
                border: `1px solid ${isAct ? col + "70" : "rgba(255,255,255,0.12)"}`,
                color: isAct ? col : "rgba(255,255,255,0.55)",
                transition: "all 0.2s",
                transform: isAct ? "scale(1.05)" : "scale(1)",
                boxShadow: isAct ? `0 0 10px ${col}30` : "none",
              }}
            >
              {i + 1} · <span style={{ opacity: 0.8 }}>{c.verdict}</span>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes highlight-pulse {
          0%   { box-shadow: 0 0 0 3px rgba(255,255,255,0.1); }
          100% { box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
