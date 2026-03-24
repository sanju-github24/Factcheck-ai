import { useState, useRef, useEffect } from "react";
import DocumentChat from "./DocumentChat";
import DocVerify    from "./DocVerify";

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
async function extractTextFromFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }

  if (name.endsWith(".pdf")) {
    // Use PDF.js from CDN
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!window.pdfjsLib) {
            // Load PDF.js dynamically
            await new Promise((res, rej) => {
              const s = document.createElement("script");
              s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
              s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          }
          const pdf   = await window.pdfjsLib.getDocument({ data: e.target.result }).promise;
          let text    = "";
          for (let p = 1; p <= Math.min(pdf.numPages, 10); p++) {
            const page    = await pdf.getPage(p);
            const content = await page.getTextContent();
            text += content.items.map(i => i.str).join(" ") + "\n\n";
          }
          resolve(text.trim().slice(0, 6000) || "Could not extract text from PDF.");
        } catch {
          resolve("PDF text extraction failed. Try copying text manually.");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  if (file.type.startsWith("image/")) {
    // Return a placeholder — backend will handle OCR via Gemini vision
    return `[IMAGE: ${file.name}] Please describe or transcribe the text in this image for fact-checking.`;
  }

  if (name.endsWith(".doc") || name.endsWith(".docx")) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!window.mammoth) {
            await new Promise((res, rej) => {
              const s = document.createElement("script");
              s.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js";
              s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
          }
          const result = await window.mammoth.extractRawText({ arrayBuffer: e.target.result });
          resolve(result.value.slice(0, 6000));
        } catch {
          resolve("Could not extract text from document.");
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  return `File: ${file.name} (${(file.size / 1024).toFixed(1)} KB) — could not extract text automatically.`;
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
    const type = file.type.startsWith("image/") ? "image"
      : file.name.endsWith(".pdf") ? "pdf" : "doc";
    try {
      const text = await extractTextFromFile(file);
      if (type === "pdf" || type === "doc") {
        // Open document chat instead of extracting to textarea
        setDocChat({ text, fileName: file.name });
        setAttachments(prev => [...prev, { name: file.name, type, id: Date.now() }]);
      } else {
        // Images still go into textarea
        setValue(prev => prev ? prev + "\n\n" + text : text);
        setAttachments(prev => [...prev, { name: file.name, type, id: Date.now() }]);
      }
    } catch (e) {
      console.error(e);
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

  const handleSubmit = () => {
    if (!value.trim() || isRunning) return;
    if (mic.recording) mic.stop();
    onRun(value.trim(), inputType);
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
            placeholder={mic.recording ? "Listening… speak your claim" : "Paste text, upload a file, or use mic…"}
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

      {/* Demo buttons */}
      {inputType === "text" && (
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
          disabled={!value.trim() || isRunning}
          style={{
            padding:"10px 24px", borderRadius:10,
            background: value.trim() && !isRunning ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.08)",
            color: value.trim() && !isRunning ? "#080c14" : "rgba(255,255,255,0.25)",
            border:"none", fontSize:13.5, fontWeight:700,
            cursor: value.trim() && !isRunning ? "pointer" : "not-allowed",
            fontFamily:"'Inter',sans-serif",
            display:"flex", alignItems:"center", gap:8,
            transition:"all 0.2s",
            boxShadow: value.trim() && !isRunning ? "0 4px 20px rgba(255,255,255,0.15)" : "none",
          }}
          onMouseEnter={e => { if (value.trim() && !isRunning) e.currentTarget.style.background="#fff"; }}
          onMouseLeave={e => { if (value.trim() && !isRunning) e.currentTarget.style.background="rgba(255,255,255,0.95)"; }}
        >
          {isRunning
            ? <><span style={{ display:"inline-block", animation:"spin 0.9s linear infinite" }}>◌</span> Analyzing…</>
            : "Verify Claims →"
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
            setValue(docChat.text);
            setDocChat(null);
          }}
        />
      )}
    </div>
  );
}