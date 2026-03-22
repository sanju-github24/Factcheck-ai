import React, { useState } from "react";

const DEMOS = [
  {
    label: "Tech facts",
    text: "OpenAI was founded in 2015 by Elon Musk and Sam Altman with a $1 billion commitment. GPT-4 has 1.76 trillion parameters. Apple became the world's first trillion-dollar company in 2018. The first iPhone was released in June 2007.",
  },
  {
    label: "Climate claims",
    text: "Global temperatures have risen by 1.5°C above pre-industrial levels as of 2024, making it the hottest year ever recorded. The Amazon rainforest now produces more CO2 than it absorbs. Electric vehicles account for over 50% of all new car sales globally.",
  },
  {
    label: "Health myths",
    text: "Humans only use 10% of their brains. Drinking 8 glasses of water per day is a scientifically proven daily requirement. Vitamin C megadoses cure the common cold. The COVID-19 mRNA vaccines alter human DNA.",
  },
];

export default function InputPanel({ onRun, isRunning }) {
  const [inputType, setInputType] = useState("text");
  const [value, setValue]         = useState("");

  const handleSubmit = () => {
    if (!value.trim() || isRunning) return;
    onRun(value.trim(), inputType);
  };

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, padding: 28,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
    }}>
      {/* Type toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {["text", "url"].map((t) => (
          <button key={t} onClick={() => setInputType(t)} style={{
            padding: "7px 18px", borderRadius: 8,
            border: `1px solid ${inputType === t ? "var(--accent)" : "var(--border)"}`,
            background: inputType === t ? "var(--accent)" : "transparent",
            color: inputType === t ? "#fff" : "var(--text-secondary)",
            fontSize: 13, fontWeight: 500, cursor: "pointer",
            fontFamily: "var(--font-body)", transition: "all 0.15s",
          }}>
            {t === "text" ? "Plain Text" : "URL / Article"}
          </button>
        ))}
      </div>

      {/* Input field */}
      {inputType === "text" ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste an article, report, or any text containing factual claims to verify…"
          rows={6}
          style={{
            width: "100%", padding: "14px 16px", borderRadius: 10,
            border: "1px solid var(--border)", fontSize: 14,
            lineHeight: 1.65, color: "var(--text-primary)",
            fontFamily: "var(--font-body)", background: "var(--surface-2)",
            resize: "vertical", outline: "none", transition: "border-color 0.15s",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com/news-article"
          style={{
            width: "100%", padding: "13px 16px", borderRadius: 10,
            border: "1px solid var(--border)", fontSize: 14,
            color: "var(--text-primary)", fontFamily: "var(--font-mono)",
            background: "var(--surface-2)", outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
        />
      )}

      {/* Demo buttons */}
      {inputType === "text" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Try demo:</span>
          {DEMOS.map((d) => (
            <button key={d.label} onClick={() => setValue(d.text)} style={{
              padding: "4px 12px", borderRadius: 20,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontSize: 12,
              cursor: "pointer", fontFamily: "var(--font-body)",
            }}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Submit */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isRunning}
          style={{
            padding: "12px 28px", borderRadius: 10,
            background: isRunning ? "#666" : "var(--accent)",
            color: "#fff", border: "none", fontSize: 14, fontWeight: 600,
            cursor: isRunning ? "not-allowed" : "pointer",
            fontFamily: "var(--font-body)",
            display: "flex", alignItems: "center", gap: 10,
            transition: "background 0.15s",
          }}
        >
          {isRunning ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 0.9s linear infinite", fontSize: 14 }}>◌</span>
              Analyzing…
            </>
          ) : (
            "Verify Claims →"
          )}
        </button>
      </div>
    </div>
  );
}
