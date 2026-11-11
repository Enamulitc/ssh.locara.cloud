import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { HostStatsBar, type HostStats } from "./HostStatsBar";

type ServerMessage =
  | { type: "data"; data: string }
  | { type: "error"; message: string }
  | { type: "exit" }
  | { type: "stats"; stats: HostStats };

// Keep a generous minimum column count so wide output (e.g. `docker ps`) doesn't get
// crushed to the panel width — the panel scrolls horizontally instead of wrapping.
const MIN_COLS = 220;

export function Terminal({
  socketUrl,
  active = false,
  showStats = false,
}: {
  socketUrl: string;
  active?: boolean;
  showStats?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "closed" | "error">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<HostStats | null>(null);

  useEffect(() => {
    if (!scrollRef.current || !containerRef.current) return;
    setStats(null);

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, ui-monospace, monospace",
      fontSize: 13,
      theme: { background: "#020617" },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    // xterm sizes its internal `.xterm-screen` element to cols*cellWidth px. Mirror that
    // width onto the element we mounted the terminal in, so the scroll wrapper below can
    // grow wider than the panel and actually produce a horizontal scrollbar.
    const screenElement = containerRef.current.querySelector<HTMLElement>(".xterm-screen");
    function syncWidth() {
      const container = containerRef.current;
      const width = screenElement?.style.width;
      if (container && width && container.style.width !== width) {
        container.style.width = width;
      }
    }

    // Cell size in px, derived once the scroll wrapper has real layout dimensions (it can
    // still be 0x0 on the very first effect run, e.g. when a session's first pane mounts in
    // the same commit as a route change). Using the scroll wrapper — which we never resize
    // — as the measurement source keeps later fits from measuring our own width override.
    let cellWidthPx: number | null = null;
    let cellHeightPx: number | null = null;

    function applyFit() {
      const scroller = scrollRef.current;
      if (!scroller) return;
      const width = scroller.clientWidth;
      const height = scroller.clientHeight;
      if (width === 0 || height === 0) return;

      if (cellWidthPx === null || cellHeightPx === null) {
        const baseline = fitAddon.proposeDimensions();
        cellWidthPx = baseline?.cols ? width / baseline.cols : 8;
        cellHeightPx = baseline?.rows ? height / baseline.rows : 17;
      }

      const rows = Math.max(1, Math.floor(height / cellHeightPx));
      const naturalCols = Math.max(1, Math.floor(width / cellWidthPx));
      term.resize(Math.max(naturalCols, MIN_COLS), rows);
      syncWidth();
    }

    applyFit();

    const socket = new WebSocket(socketUrl);

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
      if (msg.type === "stats") setStats(msg.stats);
    });

    socket.addEventListener("close", () => setStatus((s) => (s === "error" ? s : "closed")));
    socket.addEventListener("error", () => setStatus("error"));

    const dataDisposable = term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "data", data }));
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      applyFit();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    });
    resizeObserver.observe(scrollRef.current);

    const renderDisposable = term.onRender(syncWidth);

    return () => {
      dataDisposable.dispose();
      renderDisposable.dispose();
      resizeObserver.disconnect();
      socket.close();
      term.dispose();
    };
  }, [socketUrl]);

  return (
    <div
      className={[
        "flex flex-col h-full rounded-lg border overflow-hidden bg-[#020617] transition-colors",
        active ? "border-brand-500 ring-1 ring-brand-500/40" : "border-slate-800",
      ].join(" ")}
    >
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
      {showStats && stats && <HostStatsBar stats={stats} />}
      <div ref={scrollRef} className="terminal-scroll flex-1 min-h-0 overflow-x-auto overflow-y-hidden p-2">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </div>
  );
}
