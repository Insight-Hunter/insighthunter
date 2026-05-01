import { useEffect, useRef, useState } from "react";
import { useAuthToken } from "./useAuthToken";

interface AgentMessage {
  type: string;
  payload?: any;
}

export function useAgent(orgScopedId: string | null) {
  const [status, setStatus] = useState<"connecting" | "open" | "closed">(
    "connecting"
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthToken();

  useEffect(() => {
    if (!orgScopedId) return;
    const url = new URL("/agent/bookkeeping", window.location.origin);
    if (token) url.searchParams.set("token", token);
    url.searchParams.set("org", orgScopedId);

    const ws = new WebSocket(url.toString().replace("http", "ws"));
    wsRef.current = ws;

    ws.onopen = () => setStatus("open");
    ws.onclose = () => setStatus("closed");
    ws.onerror = () => setStatus("closed");
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as AgentMessage;
        if (msg.type === "pending_count" && msg.payload) {
          setPendingCount(msg.payload.count ?? 0);
        }
      } catch {
        // ignore
      }
    };

    return () => {
      ws.close();
    };
  }, [orgScopedId, token]);

  function send(msg: AgentMessage) {
    if (wsRef.current && status === "open") {
      wsRef.current.send(JSON.stringify(msg));
    }
  }

  return { status, pendingCount, send };
}
