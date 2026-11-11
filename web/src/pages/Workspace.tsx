import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Columns2, Database, FolderOpen, LayoutGrid, Terminal as TerminalIcon, X } from "lucide-react";
import { useSessionStore } from "../lib/sessionStore";
import { DEFAULT_HOST_COLOR } from "../lib/colors";
import { sshSocketUrl, kubeExecSocketUrl, dbSocketUrl } from "../lib/ws";
import { Terminal } from "../components/Terminal";
import { SftpBrowser } from "../components/SftpBrowser";
import { Resizer } from "../components/Resizer";

const MIN_PANE_PCT = 15;
const MIN_FILES_PCT = 20;

function TabPill({ id }: { id: string }) {
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const layout = useSessionStore((s) => s.layout);
  const focusedId = useSessionStore((s) => s.focusedId);
  const splitIds = useSessionStore((s) => s.splitIds);
  const focusSession = useSessionStore((s) => s.focusSession);
  const closeSession = useSessionStore((s) => s.closeSession);

  if (!session) return null;
  const active = layout === "tabs" ? id === focusedId : splitIds.includes(id);
  const KindIcon = session.kind === "ssh" ? TerminalIcon : session.kind === "kube" ? Boxes : Database;

  return (
    <button
      onClick={() => focusSession(id)}
      className={[
        "group flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-md text-sm shrink-0 border transition-colors",
        active
          ? "bg-slate-800 border-slate-700 text-white shadow shadow-black/20"
          : "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-900",
      ].join(" ")}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: session.color ?? DEFAULT_HOST_COLOR }}
      />
      <KindIcon className="h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={2} />
      <span className="truncate max-w-[12rem]">{session.displayName}</span>
      <span
        onClick={(e) => {
          e.stopPropagation();
          closeSession(id);
        }}
        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white p-0.5 rounded transition-opacity"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
    </button>
  );
}

function Pane({ id, isActive }: { id: string; isActive: boolean }) {
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const toggleFiles = useSessionStore((s) => s.toggleFiles);
  const setFilesSplit = useSessionStore((s) => s.setFilesSplit);
  const setActivePane = useSessionStore((s) => s.setActivePane);
  const containerRef = useRef<HTMLDivElement>(null);
  if (!session) return null;

  const filesSplit = session.filesSplit ?? 65;
  const canBrowseFiles = session.kind === "ssh";
  const socketUrl =
    session.kind === "ssh"
      ? sshSocketUrl(session.hostId)
      : session.kind === "kube"
        ? kubeExecSocketUrl(session.clusterId, session.namespace, session.pod, session.container)
        : dbSocketUrl(session.connectionId);

  function handleFilesDrag(deltaX: number) {
    const width = containerRef.current?.clientWidth || 1;
    const deltaPct = (deltaX / width) * 100;
    const next = Math.min(100 - MIN_FILES_PCT, Math.max(MIN_PANE_PCT, filesSplit + deltaPct));
    setFilesSplit(id, next);
  }

  return (
    <div
      className="flex flex-col h-full min-h-0 gap-2"
      onMouseDownCapture={() => setActivePane(id)}
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: session.color ?? DEFAULT_HOST_COLOR }}
          />
          {session.displayName}
        </div>
        {canBrowseFiles && (
          <button
            onClick={() => toggleFiles(id)}
            className={[
              "inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors",
              session.showFiles
                ? "bg-brand-600 border-brand-600 text-white"
                : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500",
            ].join(" ")}
          >
            <FolderOpen className="h-3.5 w-3.5" strokeWidth={2} />
            Files
          </button>
        )}
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex">
        <div
          className="min-w-0 h-full"
          style={{
            flexBasis: canBrowseFiles && session.showFiles ? `${filesSplit}%` : "100%",
            flexGrow: 0,
            flexShrink: 0,
          }}
        >
          <Terminal socketUrl={socketUrl} active={isActive} showStats={session.kind === "ssh"} />
        </div>
        {canBrowseFiles && session.showFiles && session.kind === "ssh" && (
          <>
            <Resizer onDrag={handleFilesDrag} />
            <div className="min-w-0 h-full flex-1">
              <SftpBrowser hostId={session.hostId} onClose={() => toggleFiles(id)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Workspace() {
  const order = useSessionStore((s) => s.order);
  const layout = useSessionStore((s) => s.layout);
  const focusedId = useSessionStore((s) => s.focusedId);
  const splitIds = useSessionStore((s) => s.splitIds);
  const activePaneId = useSessionStore((s) => s.activePaneId);
  const setLayout = useSessionStore((s) => s.setLayout);
  const containerRef = useRef<HTMLDivElement>(null);
  const [splitSizes, setSplitSizes] = useState<Record<string, number>>({});

  const visibleSplitIds = order.filter((id) => splitIds.includes(id));
  const visibleKey = visibleSplitIds.join(",");

  useEffect(() => {
    setSplitSizes((prev) => {
      const equal = 100 / Math.max(1, visibleSplitIds.length);
      const next: Record<string, number> = {};
      for (const id of visibleSplitIds) next[id] = prev[id] ?? equal;
      return next;
    });
  }, [visibleKey]);

  if (order.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <TerminalIcon className="h-7 w-7 text-slate-700 mb-1" strokeWidth={1.5} />
        <p className="text-slate-400">No active sessions.</p>
        <Link to="/" className="text-brand-400 hover:text-brand-300 text-sm">
          Connect to a host
        </Link>
      </div>
    );
  }

  function handleSplitDrag(idA: string, idB: string, deltaX: number) {
    const width = containerRef.current?.clientWidth || 1;
    const deltaPct = (deltaX / width) * 100;
    setSplitSizes((prev) => {
      const a = prev[idA] ?? 50;
      const b = prev[idB] ?? 50;
      let newA = a + deltaPct;
      let newB = b - deltaPct;
      if (newA < MIN_PANE_PCT) {
        newB -= MIN_PANE_PCT - newA;
        newA = MIN_PANE_PCT;
      }
      if (newB < MIN_PANE_PCT) {
        newA -= MIN_PANE_PCT - newB;
        newB = MIN_PANE_PCT;
      }
      return { ...prev, [idA]: newA, [idB]: newB };
    });
  }

  return (
    <div className="flex flex-col h-full gap-3 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
          {order.map((id) => (
            <TabPill key={id} id={id} />
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0 border border-slate-800 rounded-md p-0.5">
          <button
            onClick={() => setLayout("tabs")}
            className={[
              "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors",
              layout === "tabs" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white",
            ].join(" ")}
          >
            <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
            Tabs
          </button>
          <button
            onClick={() => setLayout("split")}
            className={[
              "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors",
              layout === "split" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white",
            ].join(" ")}
          >
            <Columns2 className="h-3.5 w-3.5" strokeWidth={2} />
            Split
          </button>
        </div>
      </div>

      {layout === "split" && splitIds.length === 0 && (
        <p className="text-sm text-slate-500">Click a tab above to add it to the split view.</p>
      )}

      <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden flex">
        {order.map((id, idx) => {
          const visible = layout === "tabs" ? id === focusedId : splitIds.includes(id);
          const nextVisibleId =
            layout === "split" ? order.slice(idx + 1).find((nid) => splitIds.includes(nid)) : undefined;
          const size = layout === "split" ? splitSizes[id] ?? 100 / Math.max(1, splitIds.length) : 100;
          const isActive = layout === "tabs" ? visible : activePaneId === id;

          return (
            <Fragment key={id}>
              <div
                style={{
                  display: visible ? "flex" : "none",
                  flexDirection: "column",
                  flexBasis: layout === "split" ? `${size}%` : "100%",
                  flexGrow: layout === "tabs" ? 1 : 0,
                  flexShrink: 0,
                  minWidth: 0,
                  height: "100%",
                }}
              >
                <Pane id={id} isActive={isActive} />
              </div>
              {visible && nextVisibleId && (
                <Resizer onDrag={(dx) => handleSplitDrag(id, nextVisibleId, dx)} />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
