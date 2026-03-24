import { useState, useRef, useCallback } from "react";
import { startCheck } from "../api/client";

const STAGE_ORDER = ["extracting", "searching", "verifying", "complete"];

export function useSSEPipeline() {
  const [status, setStatus]   = useState("idle");
  const [stage, setStage]     = useState("");
  const [logs, setLogs]       = useState([]);
  const [results, setResults] = useState([]);
  const [aiScore, setAIScore] = useState(null);
  const [report, setReport]   = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const controllerRef = useRef(null);
  const logsEndRef    = useRef(null);

  const addLog = useCallback((msg) => {
    setLogs(prev => [...prev, { msg, ts: Date.now() }]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const run = useCallback((input, inputType, { webEnabled = true, docText = null, docQuery = null } = {}) => {
    setStatus("running");
    setStage("extracting");
    setLogs([]);
    setResults([]);
    setAIScore(null);
    setReport(null);
    setErrorMsg("");

    controllerRef.current = startCheck({
      input, inputType, webEnabled, docText, docQuery,
      onEvent(data) {
        if (data.stage)       setStage(data.stage);
        if (data.message)     addLog(data.message);
        if (data.aiScore)     setAIScore(data.aiScore);
        if (data.claimResult) setResults(prev => [...prev, data.claimResult]);
        if (data.report) {
          setReport(data.report);
          if (data.report.aiScore) setAIScore(data.report.aiScore);
        }
      },
      onDone()    { setStatus("complete"); },
      onError(msg){ setStatus("error"); setErrorMsg(msg); addLog("Error: " + msg); },
    });
  }, [addLog]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setStatus("idle");
  }, []);

  return {
    status, stage, logs, results, aiScore, report, errorMsg,
    logsEndRef, run, cancel, setReport,
    stageIndex: STAGE_ORDER.indexOf(stage),
  };
}
