import { useState, useRef, useEffect } from "react";
import DocumentChat from "./DocumentChat";
import DocVerify    from "./DocVerify";
import { API_BASE } from "../api/config";

const ACCEPT_TYPES = {
  pdf:   { accept: ".pdf",                          label: "PDF Document",   icon: "📄" },
  image: { accept: "image/*,.jpg,.jpeg,.png,.webp", label: "Photo / Screenshot", icon: "🖼" },
  doc:   { accept: ".doc,.docx,.txt,.md",           label: "Document",       icon: "📝" },
};

// ── Mic recorder hook ──────────────────────────────────────────────────────
function useMicRecorder(onTranscript) {
  const [recording, setRecording]   = useState(false);
  const [supported, setSupported]   = useState(false);
  const [volume, setVolume]         = useState(0);
  const mediaRef    = useRef(null);
  const recognRef   = useRef(null);
  const animRef     = useRef(null);
  const analyserRef = useRef(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    );
    return () => stop();
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRef.current = stream;

      // Volume meter
      const ctx      = new AudioContext();
      const source   = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolume(Math.min(avg / 60, 1));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Speech recognition
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.continuous     = true;
      rec.interimResults = true;
      rec.lang           = "en-US";

      let finalText = "";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript + " ";
          else interim = e.results[i][0].transcript;
        }
        onTranscript?.(finalText + interim);
      };
      rec.onerror = () => stop();
      rec.start();
      recognRef.current = rec;
      setRecording(true);
    } catch (e) {
      console.error("Mic error:", e);
    }
  };

  const stop = () => {
    cancelAnimationFrame(animRef.current);
    recognRef.current?.stop();
    mediaRef.current?.getTracks().forEach(t => t.stop());
    recognRef.current = null;
    mediaRef.current  = null;
    setRecording(false);
    setVolume(0);
  };

  const toggle = () => recording ? stop() : start();
  return { recording, supported, volume, toggle, stop };
}

// ── File reader helpers ────────────────────────────────────────────────────
/**
 * Extract text from a document via the backend (/api/extract).
 *
 * The backend escalates pypdf → pdfplumber → Gemini OCR, so scanned PDFs and
 * multi-column layouts work, and the whole file is read rather than 10 pages.
 * Returns { text, pages, chars, method, truncated }.
 */
async function extractTextFromFile(file) {
  if (file.type.startsWith("image/")) {
    // Images stay client-side — the pipeline handles them as text prompts
    return {
      text: `[IMAGE: ${file.name}] Please describe or transcribe the text in this image for fact-checking.`,
      pages: 0, chars: 0, method: "image", truncated: false,
    };
  }

  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/api/extract`, { method: "POST", body: form });

  if (!res.ok) {
    let detail = `Extraction failed (HTTP ${res.status})`;
    try { detail = (await res.json()).detail || detail; } catch { /* non-JSON error */ }
    throw new Error(detail);
  }

  return await res.json();
}

// ── Attachment chip ────────────────────────────────────────────────────────
function AttachChip({ name, type, onRemove }) {
  const icons = { pdf:"📄", image:"🖼", doc:"📝", mic:"🎙", url:"🔗" };
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:5,
      padding:"3px 10px 3px 8px", borderRadius:20,
      background:"rgba(99,179,237,0.12)",
      border:"1px solid rgba(99,179,237,0.3)",
      fontSize:11, color:"#93c5fd",
      fontFamily:"'DM Mono',monospace",
      whiteSpace:"nowrap", maxWidth:160,
    }}>
      <span style={{ fontSize:12 }}>{icons[type] || "📎"}</span>
      <span style={{ overflow:"hidden", textOverflow:"ellipsis", maxWidth:100 }}>{name}</span>
      <button onClick={onRemove} style={{
        background:"none", border:"none", color:"rgba(147,197,253,0.6)",
        cursor:"pointer", fontSize:13, lineHeight:1, padding:0, marginLeft:2,
      }}>×</button>
    </div>
  );
}

// ── Popup menu ─────────────────────────────────────────────────────────────
function UploadMenu({ onClose, onFile, onMic, micState, onDocVerify }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 100);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPicker = (accept) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = accept; input.multiple = false;
    input.onchange = (e) => { if (e.target.files[0]) onFile(e.target.files[0]); };
    input.click();
    onClose();
  };

  const ITEMS = [
    { label: "Photo / Screenshot",  sub: "jpg, png, webp",      icon: "🖼", action: () => openPicker("image/*") },
    { label: "PDF Document",        sub: "Extract text from PDF", icon: "📄", action: () => openPicker(".pdf") },
    { label: "Document",            sub: "docx, txt, md",        icon: "📝", action: () => openPicker(".doc,.docx,.txt,.md") },
    { label: "Verify Document Claims",
      sub: "Upload doc + enter claim + web verify",
      icon: "🔍",
      action: () => { onDocVerify?.(); onClose(); },
    },
    { label: micState.recording ? "Stop Recording" : "Microphone",
      sub: micState.recording ? "Click to stop" : "Speak your claim",
      icon: "🎙",
      action: () => { onMic(); onClose(); },
      active: micState.recording,
    },
  ];

  return (
    <div ref={menuRef} style={{
      position:"absolute", bottom:"calc(100% + 8px)", left:0,
      background:"rgba(12,16,28,0.97)",
      border:"1px solid rgba(255,255,255,0.12)",
      borderRadius:14, padding:"6px 0",
      boxShadow:"0 12px 40px rgba(0,0,0,0.6)",
      backdropFilter:"blur(20px)",
      zIndex:200, minWidth:240,
      animation:"menu-appear 0.15s ease",
    }}>
      {ITEMS.map((item, i) => (
        <button key={i} onClick={item.action} style={{
          display:"flex", alignItems:"center", gap:12,
          width:"100%", padding:"10px 16px",
          background: item.active ? "rgba(248,113,113,0.1)" : "transparent",
          border:"none", cursor:"pointer",
          transition:"background 0.1s",
          textAlign:"left",
        }}
        onMouseEnter={e => !item.active && (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
        onMouseLeave={e => !item.active && (e.currentTarget.style.background = "transparent")}
        >
          <span style={{ fontSize:18, width:24, textAlign:"center" }}>{item.icon}</span>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:500, color: item.active ? "#f87171" : "#e8eaf0", fontFamily:"'Inter',sans-serif" }}>
              {item.label}
            </p>
            <p style={{ margin:0, fontSize:11, color:"rgba(200,210,240,0.45)", fontFamily:"'DM Mono',monospace" }}>
              {item.sub}
            </p>
          </div>
          {item.active && (
            <div style={{
              marginLeft:"auto", width:8, height:8, borderRadius:"50%",
              background:"#f87171", boxShadow:"0 0 10px #f87171",
              animation:"dot-pulse 1s ease-in-out infinite",
            }}/>
          )}
        </button>
      ))}
      <style>{`
        @keyframes menu-appear { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes dot-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>
    </div>
  );
}

// ── Main MultiInputPanel ───────────────────────────────────────────────────
export default function MultiInputPanel({ onRun, isRunning }) {
  const [inputType, setInputType]   = useState("text");
  const [value, setValue]           = useState("");
  const [showMenu, setShowMenu]     = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [docChat, setDocChat]         = useState(null);
  const [showDocVerify, setDocVerify] = useState(false); // {text, fileName}
  const [doc, setDoc]                 = useState(null);  // extracted document
  const [uploadError, setUploadError] = useState("");
  const textareaRef = useRef(null);

  const mic = useMicRecorder((transcript) => {
    setValue(transcript);
  });

  const DEMOS = [
    { label: "Tech facts",    text: "OpenAI was founded in 2015 by Elon Musk and Sam Altman with a $1 billion commitment. GPT-4 has 1.76 trillion parameters. Apple became the world's first trillion-dollar company in 2018." },
    { label: "Climate",      text: "Global temperatures have risen by 1.5°C above pre-industrial levels as of 2024. The Amazon rainforest now produces more CO2 than it absorbs." },
    { label: "Health myths", text: "Humans only use 10% of their brains. Vitamin C megadoses cure the common cold. The COVID-19 mRNA vaccines alter human DNA." },
  ];

  const handleFile = async (file) => {
    setProcessing(true);
    setUploadError("");
    const type = file.type.startsWith("image/") ? "image"
      : file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "doc";
    try {
      const result = await extractTextFromFile(file);

      if (type === "image") {
        setValue(prev => prev ? prev + "\n\n" + result.text : result.text);
        setAttachments(prev => [...prev, { name: file.name, type, id: Date.now() }]);
      } else {
        // Documents feed the main fact-check pipeline so the full report
        // renders on the main page. DocumentChat stays available separately.
        setDoc({
          fileName:  file.name,
          text:      result.text,
          pages:     result.pages,
          chars:     result.chars,
          method:    result.method,
          truncated: result.truncated,
        });
        setAttachments(prev => [...prev, { name: file.name, type, id: Date.now() }]);
      }
    } catch (e) {
      console.error(e);
      setUploadError(e.message || "Could not read that file.");
    }
    setProcessing(false);
  };

  const handleMic = () => {
    mic.toggle();
    if (!mic.recording) {
      setAttachments(prev => [...prev, { name: "Voice recording", type: "mic", id: Date.now() }]);
    } else {
      setAttachments(prev => prev.filter(a => a.type !== "mic"));
    }
  };

  const removeAttachment = (id) => setAttachments(prev => prev.filter(a => a.id !== id));

  const removeDoc = () => {
    setAttachments(prev => prev.filter(a => a.type !== "pdf" && a.type !== "doc"));
    setDoc(null);
  };

  // A document alone is enough to submit — typed text is optional
  const canSubmit = Boolean(doc?.text?.trim() || value.trim());

  const handleSubmit = () => {
    if (!canSubmit || isRunning) return;
    if (mic.recording) mic.stop();

    // Document text goes through the normal /api/check pipeline, so claim
    // extraction + Gemini verdicts render in the main report.
    const payload = doc?.text
      ? (value.trim() ? `${doc.text}\n\n${value.trim()}` : doc.text)
      : value.trim();

    onRun(payload, doc ? "text" : inputType);
  };

  // Drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div style={{
      width:"100%", maxWidth:660,
      background:"rgba(255,255,255,0.06)",
      border:`1px solid ${mic.recording ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.14)"}`,
      borderRadius:16, padding:22,
      backdropFilter:"blur(20px)",
      boxShadow:"0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
      transition:"border-color 0.3s",
    }}
    onDragOver={e => e.preventDefault()}
    onDrop={handleDrop}
    >

      {/* Type toggle */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {["text","url"].map(t => (
          <button key={t} onClick={() => setInputType(t)} style={{
            padding:"6px 16px", borderRadius:8,
            border:`1px solid ${inputType===t ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.12)"}`,
            background: inputType===t ? "rgba(255,255,255,0.14)" : "transparent",
            color: inputType===t ? "#fff" : "rgba(200,210,240,0.65)",
            fontSize:13, fontWeight:500, cursor:"pointer",
            fontFamily:"'Inter',sans-serif", transition:"all 0.15s",
          }}>
            {t === "text" ? "Plain Text" : "URL / Article"}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div style={{ position:"relative" }}>
        {inputType === "text" ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && e.metaKey) handleSubmit(); }}
            placeholder={
              mic.recording ? "Listening… speak your claim"
              : doc         ? "Optional: add extra context or a specific claim to focus on…"
              : "Paste text, upload a file, or use mic…"
            }
            rows={5}
            style={{
              width:"100%", padding:"13px 15px 13px 15px",
              paddingBottom: attachments.length ? "48px" : "13px",
              borderRadius:10,
              border:`1px solid ${mic.recording ? "rgba(248,113,113,0.35)" : "rgba(255,255,255,0.12)"}`,
              fontSize:13.5, lineHeight:1.65, color:"#eef0f8",
              fontFamily:"'Inter',sans-serif",
              background:"rgba(255,255,255,0.05)",
              resize:"vertical", outline:"none",
              transition:"border-color 0.3s",
              boxSizing:"border-box",
            }}
            onFocus={e => { if (!mic.recording) e.target.style.borderColor = "rgba(255,255,255,0.4)"; }}
            onBlur={e  => { if (!mic.recording) e.target.style.borderColor = "rgba(255,255,255,0.12)"; }}
          />
        ) : (
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="https://example.com/news-article"
            style={{
              width:"100%", padding:"12px 15px", borderRadius:10,
              border:"1px solid rgba(255,255,255,0.12)", fontSize:13.5,
              color:"#eef0f8", fontFamily:"'DM Mono',monospace",
              background:"rgba(255,255,255,0.05)", outline:"none",
              boxSizing:"border-box", transition:"border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(255,255,255,0.4)"}
            onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.12)"}
          />
        )}

        {/* Mic volume visualizer overlay */}
        {mic.recording && (
          <div style={{
            position:"absolute", top:10, right:12,
            display:"flex", alignItems:"center", gap:3,
          }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{
                width:3, borderRadius:2,
                background:"#f87171",
                height: `${8 + mic.volume * 20 * Math.sin((i+1) * 0.8 + Date.now()/200)}px`,
                minHeight:4, maxHeight:24,
                transition:"height 0.08s",
                opacity: 0.6 + mic.volume * 0.4,
              }}/>
            ))}
          </div>
        )}

        {/* Attachment chips inside textarea bottom */}
        {attachments.length > 0 && (
          <div style={{
            position:"absolute", bottom:10, left:12,
            display:"flex", gap:6, flexWrap:"wrap",
          }}>
            {attachments.map(a => (
              <AttachChip key={a.id} name={a.name} type={a.type} onRemove={() => removeAttachment(a.id)}/>
            ))}
          </div>
        )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div style={{
          marginTop:10, padding:"10px 13px", borderRadius:10,
          background:"rgba(248,113,113,0.12)", border:"1px solid rgba(248,113,113,0.35)",
          color:"#fca5a5", fontSize:12.5, fontFamily:"'Inter',sans-serif",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:10,
        }}>
          <span>⚠ {uploadError}</span>
          <button onClick={() => setUploadError("")} style={{
            background:"transparent", border:"none", color:"#fca5a5",
            cursor:"pointer", fontSize:15, lineHeight:1, padding:0,
          }}>×</button>
        </div>
      )}

      {/* Extracted document card */}
      {doc && (
        <div style={{
          marginTop:10, padding:"12px 14px", borderRadius:12,
          background:"rgba(99,179,237,0.09)",
          border:"1px solid rgba(99,179,237,0.32)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <span style={{ fontSize:17 }}>📄</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{
                fontSize:13, fontWeight:600, color:"#eef0f8",
                fontFamily:"'Inter',sans-serif",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              }}>{doc.fileName}</div>
              <div style={{
                fontSize:11.5, color:"rgba(200,210,240,0.6)",
                fontFamily:"'DM Mono',monospace", marginTop:2,
              }}>
                {doc.pages > 0 && `${doc.pages} page${doc.pages === 1 ? "" : "s"} · `}
                {doc.chars.toLocaleString()} chars extracted
                {doc.method === "gemini-ocr" && " · OCR (scanned)"}
                {doc.truncated && " · truncated"}
              </div>
            </div>
            <button
              onClick={() => setDocChat({ text: doc.text, fileName: doc.fileName })}
              title="Ask questions about this document"
              style={{
                padding:"6px 11px", borderRadius:8, whiteSpace:"nowrap",
                border:"1px solid rgba(255,255,255,0.18)", background:"rgba(255,255,255,0.06)",
                color:"rgba(220,230,255,0.9)", fontSize:11.5, cursor:"pointer",
                fontFamily:"'Inter',sans-serif",
              }}
            >💬 Ask</button>
            <button onClick={removeDoc} title="Remove document" style={{
              background:"transparent", border:"none", color:"rgba(200,210,240,0.5)",
              cursor:"pointer", fontSize:17, lineHeight:1, padding:"0 2px",
            }}>×</button>
          </div>

          <div style={{
            marginTop:9, paddingTop:9, borderTop:"1px solid rgba(255,255,255,0.09)",
            fontSize:11.5, color:"rgba(200,210,240,0.55)",
            fontFamily:"'Inter',sans-serif", lineHeight:1.5,
          }}>
            Claims will be extracted from the whole document and verified with Gemini —
            the full report appears below.
          </div>
        </div>
      )}

      {/* Demo buttons */}
      {inputType === "text" && !doc && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginTop:10, alignItems:"center" }}>
          <span style={{ fontSize:12, color:"rgba(200,210,240,0.5)" }}>Try demo:</span>
          {DEMOS.map(d => (
            <button key={d.label} onClick={() => setValue(d.text)} style={{
              padding:"4px 12px", borderRadius:20,
              border:"1px solid rgba(255,255,255,0.14)", background:"transparent",
              color:"rgba(200,210,240,0.7)", fontSize:12,
              cursor:"pointer", fontFamily:"'Inter',sans-serif", transition:"all 0.15s",
            }}
            onMouseEnter={e => { e.target.style.borderColor="rgba(255,255,255,0.4)"; e.target.style.color="#fff"; }}
            onMouseLeave={e => { e.target.style.borderColor="rgba(255,255,255,0.14)"; e.target.style.color="rgba(200,210,240,0.7)"; }}
            >{d.label}</button>
          ))}
        </div>
      )}

      {/* ── Bottom bar: + button + submit ── */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:14, gap:10 }}>

        {/* Left: + button with popup */}
        <div style={{ position:"relative" }}>
          <button
            onClick={() => setShowMenu(v => !v)}
            title="Attach file, image, or use microphone"
            style={{
              width:36, height:36, borderRadius:10,
              border:`1px solid ${showMenu ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.18)"}`,
              background: showMenu ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
              color:"#fff", fontSize:20, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              transition:"all 0.15s", lineHeight:1,
              transform: showMenu ? "rotate(45deg)" : "rotate(0deg)",
            }}
          >+</button>

          {/* Processing spinner */}
          {processing && (
            <div style={{
              position:"absolute", inset:0, borderRadius:10,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:"rgba(12,16,28,0.8)",
            }}>
              <span style={{ animation:"spin 0.8s linear infinite", color:"#63b3ed", fontSize:16 }}>◌</span>
            </div>
          )}

          {showMenu && (
            <UploadMenu
              onClose={() => setShowMenu(false)}
              onFile={handleFile}
              onMic={handleMic}
              micState={mic}
              onDocVerify={() => setDocVerify(true)}
            />
          )}
        </div>

        {/* Drag hint */}
        <span style={{ fontSize:11, color:"rgba(200,210,240,0.3)", fontFamily:"'DM Mono',monospace", flex:1 }}>
          {mic.recording ? "🔴 recording…" : "drag & drop files here"}
        </span>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isRunning}
          style={{
            padding:"10px 24px", borderRadius:10,
            background: canSubmit && !isRunning ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.08)",
            color: canSubmit && !isRunning ? "#080c14" : "rgba(255,255,255,0.25)",
            border:"none", fontSize:13.5, fontWeight:700,
            cursor: canSubmit && !isRunning ? "pointer" : "not-allowed",
            fontFamily:"'Inter',sans-serif",
            display:"flex", alignItems:"center", gap:8,
            transition:"all 0.2s",
            boxShadow: canSubmit && !isRunning ? "0 4px 20px rgba(255,255,255,0.15)" : "none",
          }}
          onMouseEnter={e => { if (canSubmit && !isRunning) e.currentTarget.style.background="#fff"; }}
          onMouseLeave={e => { if (canSubmit && !isRunning) e.currentTarget.style.background="rgba(255,255,255,0.95)"; }}
        >
          {isRunning
            ? <><span style={{ display:"inline-block", animation:"spin 0.9s linear infinite" }}>◌</span> Analyzing…</>
            : doc ? "Fact-check Document →" : "Verify Claims →"
          }
        </button>
      </div>

      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        textarea::placeholder, input::placeholder { color:rgba(255,255,255,0.2); }
      `}</style>

      {/* DocVerify modal */}
      {showDocVerify && <DocVerify onClose={() => setDocVerify(false)} />}

      {/* Document Chat modal */}
      {docChat && (
        <DocumentChat
          documentText={docChat.text}
          fileName={docChat.fileName}
          onClose={() => setDocChat(null)}
          onFactCheck={() => {
            // Run the document through the main pipeline
            setDocChat(null);
            if (!isRunning) onRun(docChat.text, "text");
          }}
        />
      )}
    </div>
  );
}