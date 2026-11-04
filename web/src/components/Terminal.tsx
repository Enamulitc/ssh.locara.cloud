import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { sshSocketUrl } from "../lib/ws";

type ServerMessage =
  | { type: "data"; data: string }
  | { type: "error"; message: string }
  | { type: "exit" };

export function Terminal({ hostId }: { hostId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "closed" | "error">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      fontSize: 13,
      theme: { background: "#020617" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    const socket = new WebSocket(sshSocketUrl(hostId));

    socket.addEventListener("open", () => {
      setStatus("connected");
      socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
    });

    socket.addEventListener("message", (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      if (msg.type === "data") term.write(msg.data);
      if (msg.type === "error") {
        setStatus("error");
        setErrorMessage(msg.message);
      }
      if (msg.type === "exit") setStatus("closed");
    });

    socket.addEventListener("close", () => setStatus((s) => (s === "error" ? s : "closed")));
    socket.addEventListener("error", () => setStatus("error"));

    const dataDisposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "data", data }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      socket.close();
      term.dispose();
    };
  }, [hostId]);

  return (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 overflow-hidden bg-[#020617]">
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-slate-800 text-xs text-slate-500">
        <span
          className={[
            "h-2 w-2 rounded-full",
            status === "connected" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-500" : "bg-red-500",
          ].join(" ")}
        />
        {status === "connecting" && "Connecting…"}
        {status === "connected" && "Connected"}
        {status === "closed" && "Session closed"}
        {status === "error" && (errorMessage ?? "Connection error")}
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden p-2" />
    </div>
  );
}
