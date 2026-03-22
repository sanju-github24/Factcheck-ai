const BASE = "/api";

/**
 * Opens an SSE connection to POST /api/check.
 * Because EventSource only supports GET, we use fetch + ReadableStream.
 *
 * onEvent(data: object) is called for each parsed SSE message.
 * Returns an AbortController so the caller can cancel.
 */
export function startCheck({ input, inputType, onEvent, onDone, onError }) {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${BASE}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, input_type: inputType }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") { onDone?.(); return; }
          try { onEvent(JSON.parse(payload)); } catch (_) {}
        }
      }
      onDone?.();
    } catch (err) {
      if (err.name !== "AbortError") onError?.(err.message);
    }
  })();

  return controller;
}
