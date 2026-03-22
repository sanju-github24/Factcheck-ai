import { useEffect, useRef, useState } from "react";

/**
 * TypewriterText
 * Animates text appearing character by character — like Gemini's live generation.
 * 
 * Props:
 *   text        — the full string to animate
 *   speed       — ms per character (default 18)
 *   delay       — ms before starting (default 0)  
 *   onDone      — callback when animation completes
 *   cursor      — show blinking cursor (default true)
 *   className   — optional wrapper class
 *   style       — optional inline styles
 */
export default function TypewriterText({
  text = "",
  speed = 18,
  delay = 0,
  onDone,
  cursor = true,
  style = {},
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone]           = useState(false);
  const [started, setStarted]     = useState(false);
  const idxRef  = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    setStarted(false);
    idxRef.current = 0;

    const startDelay = setTimeout(() => {
      setStarted(true);
      const tick = () => {
        if (idxRef.current < text.length) {
          // Burst mode — add 1-3 chars at a time for natural feel
          const burst = Math.min(
            1 + Math.floor(Math.random() * 2),
            text.length - idxRef.current
          );
          idxRef.current += burst;
          setDisplayed(text.slice(0, idxRef.current));
          timerRef.current = setTimeout(tick, speed + Math.random() * speed * 0.4);
        } else {
          setDone(true);
          onDone?.();
        }
      };
      timerRef.current = setTimeout(tick, 0);
    }, delay);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(timerRef.current);
    };
  }, [text]);

  return (
    <span style={{ ...style, position: "relative" }}>
      {displayed}
      {cursor && !done && started && (
        <span style={{
          display: "inline-block",
          width: 2, height: "1em",
          background: "currentColor",
          marginLeft: 1,
          verticalAlign: "text-bottom",
          animation: "tw-blink 0.7s step-end infinite",
        }}/>
      )}
      <style>{`
        @keyframes tw-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </span>
  );
}

/**
 * TypewriterBlock
 * Animates multiple text fields in sequence — one after another.
 * Use this for claim cards where summary → evidence → nuance appear one by one.
 * 
 * Props:
 *   items   — array of { text, style, speed, delay }
 *   gap     — ms between each item completing and next starting (default 120)
 */
export function TypewriterBlock({ items = [], gap = 120 }) {
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <>
      {items.map((item, i) => (
        <span key={i} style={{
          display: "block",
          opacity: i <= activeIdx ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}>
          {i <= activeIdx && (
            <TypewriterText
              text={item.text || ""}
              speed={item.speed ?? 16}
              delay={i === activeIdx ? 0 : 0}
              style={item.style || {}}
              cursor={i === activeIdx}
              onDone={() => {
                setTimeout(() => {
                  setActiveIdx(prev => Math.min(prev + 1, items.length - 1));
                }, gap);
              }}
            />
          )}
        </span>
      ))}
    </>
  );
}
