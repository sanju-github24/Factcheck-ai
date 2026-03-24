import React, { useState, useRef, useEffect } from "react";
import TypewriterText from "./TypewriterText";

export default function DocumentChat({ documentText, fileName, onClose, onFactCheck }) {
  const [messages, setMessages]   = useState([
    { role: "assistant", content: `I've loaded **${fileName}**. Ask me anything about it, or click "Fact-Check This Document" to verify its claims.` }
  ]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const bottomRef                 = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const res  = await fetch("/api/docqa", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          document_text: documentText,
          question,
          history: messages.slice(-6),
          web_search: webSearch,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error reaching server." }]);
    }
    setLoading(false);
  };

  const suggestedQuestions = [
    "What are the main claims in this document?",
    "Summarize this document in 3 sentences",
    "What evidence is provided?",
    "Are there any controversial statements?",
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: "100%", maxWidth: 640, height: "80vh",
        background: "#080c14", border: "1px solid rgba(99,179,237,0.3)",
        borderRadius: 20, display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
      }}>

        {/* Header */}
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.04)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📄</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0, fontFamily: "'Syne',sans-serif" }}>
                {fileName}
              </p>
              <p style={{ fontSize: 10, color: "rgba(200,210,240,0.45)", margin: 0, fontFamily: "'DM Mono',monospace" }}>
                Ask anything from this document
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onFactCheck} style={{
              padding: "7px 14px", borderRadius: 8, fontSize: 11, cursor: "pointer",
              background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.4)",
              color: "#4ade80", fontFamily: "'DM Mono',monospace", fontWeight: 700,
            }}>
              ✓ Fact-Check This
            </button>
            <button onClick={onClose} style={{
              width: 30, height: 30, borderRadius: "50%", fontSize: 14,
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(200,210,240,0.6)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 20px",
          display: "flex", flexDirection: "column", gap: 12,
          scrollbarWidth: "none",
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "80%", padding: "10px 14px", borderRadius: 14,
                background: msg.role === "user"
                  ? "rgba(99,179,237,0.15)"
                  : "rgba(255,255,255,0.05)",
                border: `1px solid ${msg.role === "user" ? "rgba(99,179,237,0.3)" : "rgba(255,255,255,0.1)"}`,
                borderBottomRightRadius: msg.role === "user" ? 4 : 14,
                borderBottomLeftRadius:  msg.role === "user" ? 14 : 4,
              }}>
                {msg.web_used && (
                  <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:6 }}>
                    <span style={{ fontSize:9, padding:"2px 8px", borderRadius:20,
                      background:"rgba(99,179,237,0.15)", border:"1px solid rgba(99,179,237,0.3)",
                      color:"#63b3ed", fontFamily:"'DM Mono',monospace", fontWeight:700
                    }}>🌐 Web + Document</span>
                  </div>
                )}
                <p style={{
                  fontSize: 13, color: "#e8eaf0", margin: 0, lineHeight: 1.65,
                  fontFamily: "'Inter',sans-serif",
                }}>
                  {msg.role === "assistant" && i === messages.length - 1 && !loading ? (
                    <TypewriterText text={msg.content} speed={12} cursor={false} style={{ color: "#e8eaf0" }}/>
                  ) : msg.content}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", gap: 5, padding: "8px 14px" }}>
              {[0,1,2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#63b3ed", opacity: 0.7,
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}/>
              ))}
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Suggested questions */}
        {messages.length === 1 && (
          <div style={{ padding: "0 20px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {suggestedQuestions.map((q, i) => (
              <button key={i} onClick={() => { setInput(q); }} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 11,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(200,210,240,0.65)", cursor: "pointer",
                fontFamily: "'Inter',sans-serif", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.target.style.borderColor="rgba(99,179,237,0.4)"; e.target.style.color="#93c5fd"; }}
              onMouseLeave={e => { e.target.style.borderColor="rgba(255,255,255,0.12)"; e.target.style.color="rgba(200,210,240,0.65)"; }}
              >{q}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{
          padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)",
          display: "flex", gap: 10, alignItems: "center",
          background: "rgba(255,255,255,0.03)",
        }}>
          {/* Web Search toggle */}
          <button
            onClick={() => setWebSearch(w => !w)}
            title={webSearch ? "Web search ON — click to use document only" : "Web search OFF — click to also search web"}
            style={{
              width: 40, height: 40, borderRadius: 10, fontSize: 14, flexShrink: 0,
              background: webSearch ? "rgba(99,179,237,0.2)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${webSearch ? "rgba(99,179,237,0.5)" : "rgba(255,255,255,0.12)"}`,
              color: webSearch ? "#63b3ed" : "rgba(255,255,255,0.3)",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", transition: "all 0.2s",
              boxShadow: webSearch ? "0 0 10px rgba(99,179,237,0.3)" : "none",
            }}
          >🌐</button>

          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder={webSearch ? "Ask anything (document + web search)…" : "Ask anything about this document only…"}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)", color: "#e8eaf0",
              fontSize: 13, fontFamily: "'Inter',sans-serif", outline: "none",
            }}
            onFocus={e => e.target.style.borderColor="rgba(99,179,237,0.5)"}
            onBlur={e  => e.target.style.borderColor="rgba(255,255,255,0.12)"}
          />
          <button onClick={send} disabled={!input.trim() || loading} style={{
            width: 40, height: 40, borderRadius: 10, fontSize: 16,
            background: input.trim() && !loading ? "rgba(99,179,237,0.2)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${input.trim() && !loading ? "rgba(99,179,237,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: input.trim() && !loading ? "#63b3ed" : "rgba(255,255,255,0.2)",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}>→</button>
        </div>

        <style>{`
          @keyframes bounce {
            0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)}
          }
          div::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </div>
  );
}