import React from "react";

const STAGES = [
  { id: "extracting", label: "Extracting" },
  { id: "searching",  label: "Searching" },
  { id: "verifying",  label: "Verifying" },
  { id: "complete",   label: "Done" },
];

export default function PipelineProgress({ stage, stageIndex, logs, logsEndRef, status }) {
  const isComplete = status === "complete";

  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 16, padding: 24, marginTop: 16,
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      animation: "slide-up 0.25s ease",
    }}>
      {/* Stage pills */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
        {STAGES.map((s, i) => {
          const done   = i < stageIndex || isComplete;
          const active = i === stageIndex && !isComplete;
          return (
            <React.Fragment key={s.id}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 72 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: done || isComplete ? "var(--accent)" : active ? "var(--accent-soft)" : "var(--surface-2)",
                  border: `2px solid ${done || isComplete ? "var(--accent)" : active ? "var(--accent)" : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  color: done || isComplete ? "#fff" : active ? "var(--accent)" : "var(--text-muted)",
                  transition: "all 0.3s",
                }}>
                  {done || isComplete ? "✓" : i + 1}
                </div>
                <span style={{
                  fontSize: 11, marginTop: 5,
                  color: active ? "var(--accent)" : done ? "var(--text-secondary)" : "var(--text-muted)",
                  fontWeight: active ? 600 : 400,
                  fontFamily: "var(--font-body)",
                }}>
                  {s.label}
                </span>
              </div>
              {i < STAGES.length - 1 && (
                <div style={{
                  flex: 1, height: 2, margin: "0 4px 18px",
                  background: done ? "var(--accent)" : "var(--border)",
                  transition: "background 0.4s",
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Terminal log */}
      <div style={{
        background: "var(--terminal-bg)", borderRadius: 10,
        padding: "14px 16px", maxHeight: 200, overflowY: "auto",
        fontFamily: "var(--font-mono)", fontSize: 12,
      }}>
        {logs.length === 0 && (
          <span style={{ color: "var(--terminal-muted)" }}>Starting pipeline…</span>
        )}
        {logs.map((l, i) => (
          <div key={i} style={{
            color: i === logs.length - 1 ? "var(--terminal-text)" : "#6a7d6a",
            marginBottom: 3, lineHeight: 1.6,
          }}>
            <span style={{ color: "var(--terminal-muted)" }}>
              [{new Date(l.ts).toLocaleTimeString()}]
            </span>{" "}
            {l.msg}
          </div>
        ))}
        {status === "running" && (
          <span style={{ color: "#f6c90e", animation: "pulse-dot 1s infinite" }}>▎</span>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}
