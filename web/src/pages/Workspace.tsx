import { Link } from "react-router-dom";
import { useSessionStore } from "../lib/sessionStore";
import { DEFAULT_HOST_COLOR } from "../lib/colors";
import { Terminal } from "../components/Terminal";
import { SftpBrowser } from "../components/SftpBrowser";

function TabPill({ id }: { id: string }) {
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const layout = useSessionStore((s) => s.layout);
  const focusedId = useSessionStore((s) => s.focusedId);
  const splitIds = useSessionStore((s) => s.splitIds);
  const focusSession = useSessionStore((s) => s.focusSession);
  const closeSession = useSessionStore((s) => s.closeSession);

  if (!session) return null;
  const active = layout === "tabs" ? id === focusedId : splitIds.includes(id);

  return (
    <button
      onClick={() => focusSession(id)}
      className={[
        "group flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-md text-sm shrink-0 border transition-colors",
        active
          ? "bg-slate-800 border-slate-700 text-white"
          : "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-slate-900",
      ].join(" ")}
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: session.hostColor ?? DEFAULT_HOST_COLOR }}
      />
      <span className="truncate max-w-[12rem]">{session.hostName}</span>
      <span
        onClick={(e) => {
          e.stopPropagation();
          closeSession(id);
        }}
        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white px-1 rounded"
      >
        ×
      </span>
    </button>
  );
}

function Pane({ id }: { id: string }) {
  const session = useSessionStore((s) => s.sessions.find((x) => x.id === id));
  const toggleFiles = useSessionStore((s) => s.toggleFiles);
  if (!session) return null;

  return (
    <div className="flex flex-col h-full min-h-0 gap-2">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: session.hostColor ?? DEFAULT_HOST_COLOR }}
          />
          {session.hostName}
        </div>
        <button
          onClick={() => toggleFiles(id)}
          className={[
            "text-xs px-2 py-1 rounded-md border",
            session.showFiles
              ? "bg-brand-600 border-brand-600 text-white"
              : "border-slate-700 text-slate-400 hover:text-white",
          ].join(" ")}
        >
          Files
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex gap-2">
        <div className={session.showFiles ? "flex-[2] min-w-0 h-full" : "flex-1 min-w-0 h-full"}>
          <Terminal hostId={session.hostId} />
        </div>
        {session.showFiles && (
          <div className="flex-[1] min-w-0 h-full">
            <SftpBrowser hostId={session.hostId} />
          </div>
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
  const setLayout = useSessionStore((s) => s.setLayout);

  if (order.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center gap-2">
        <p className="text-slate-400">No active sessions.</p>
        <Link to="/" className="text-brand-400 hover:text-brand-300 text-sm">
          Connect to a host
        </Link>
      </div>
    );
  }

  const columns = layout === "tabs" ? 1 : Math.max(1, splitIds.length);

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] gap-3 overflow-hidden">
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
              "text-xs px-2.5 py-1 rounded",
              layout === "tabs" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white",
            ].join(" ")}
          >
            Tabs
          </button>
          <button
            onClick={() => setLayout("split")}
            className={[
              "text-xs px-2.5 py-1 rounded",
              layout === "split" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-white",
            ].join(" ")}
          >
            Split
          </button>
        </div>
      </div>

      {layout === "split" && splitIds.length === 0 && (
        <p className="text-sm text-slate-500">Click a tab above to add it to the split view.</p>
      )}

      <div
        className="flex-1 min-h-0 overflow-hidden grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {order.map((id) => {
          const visible = layout === "tabs" ? id === focusedId : splitIds.includes(id);
          return (
            <div key={id} className={visible ? "h-full min-h-0 overflow-hidden" : "hidden"}>
              <Pane id={id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
