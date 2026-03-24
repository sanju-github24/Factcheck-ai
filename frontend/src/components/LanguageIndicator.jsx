import React, { useState } from "react";

const FLAG_MAP = {
  en: "🇬🇧", hi: "🇮🇳", ta: "🇮🇳", te: "🇮🇳", kn: "🇮🇳",
  ml: "🇮🇳", mr: "🇮🇳", bn: "🇧🇩", pa: "🇮🇳",
  es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪", ar: "🇸🇦",
  zh: "🇨🇳", ja: "🇯🇵", pt: "🇧🇷", ru: "🇷🇺",
  ko: "🇰🇷", it: "🇮🇹", tr: "🇹🇷",
};

export default function LanguageIndicator({ langInfo, onToggleLanguage, showingOriginal }) {
  if (!langInfo) return null;

  const { language, language_code, is_english, confidence, rtl } = langInfo;
  const flag = FLAG_MAP[language_code] || "🌐";
  const conf = Math.round((confidence ?? 1) * 100);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 16px",
      background: is_english ? "rgba(255,255,255,0.03)" : "rgba(99,179,237,0.08)",
      border: `1px solid ${is_english ? "rgba(255,255,255,0.08)" : "rgba(99,179,237,0.25)"}`,
      borderRadius: 12, backdropFilter: "blur(8px)",
      flexWrap: "wrap",
    }}>
      {/* Flag + language */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>{flag}</span>
        <div>
          <span style={{
            fontSize: 12, fontWeight: 700, color: "#fff",
            fontFamily: "'Syne',sans-serif",
          }}>{language}</span>
          <span style={{
            fontSize: 10, color: "rgba(200,210,240,0.45)",
            fontFamily: "'DM Mono',monospace", marginLeft: 6,
          }}>{conf}% confidence</span>
        </div>
      </div>

      {/* Non-English indicator */}
      {!is_english && (
        <>
          <div style={{ height: 16, width: 1, background: "rgba(255,255,255,0.1)" }}/>

          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 20,
            background: "rgba(99,179,237,0.15)",
            border: "1px solid rgba(99,179,237,0.3)",
            color: "#63b3ed", fontFamily: "'DM Mono',monospace",
          }}>
            ✓ Results translated to {language}
          </span>

          {/* Language toggle */}
          <button
            onClick={onToggleLanguage}
            style={{
              marginLeft: "auto",
              padding: "5px 14px", borderRadius: 20, fontSize: 11,
              border: "1px solid rgba(255,255,255,0.15)",
              background: showingOriginal ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
              color: "rgba(200,210,240,0.8)", cursor: "pointer",
              fontFamily: "'DM Mono',monospace", transition: "all 0.15s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {showingOriginal ? `🌐 Show in ${language}` : "🇬🇧 Show in English"}
          </button>
        </>
      )}

      {is_english && (
        <span style={{
          fontSize: 10, color: "rgba(200,210,240,0.35)",
          fontFamily: "'DM Mono',monospace", marginLeft: "auto",
        }}>
          English detected — no translation needed
        </span>
      )}
    </div>
  );
}