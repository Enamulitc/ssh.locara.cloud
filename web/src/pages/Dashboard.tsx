import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, Pencil, Plus, Search, Terminal as TerminalIcon, Trash2, Upload } from "lucide-react";
import { useDeleteHost, useHosts, useTeams } from "../lib/hooks";
import { useSessionStore } from "../lib/sessionStore";
import { DEFAULT_HOST_COLOR } from "../lib/colors";
import { ExportDialog, ImportDialog } from "../components/TransferDialogs";
import type { Host } from "../lib/api";

function timeAgo(iso: string | null) {
  if (!iso) return "Never connected";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function HostRow({ host, teamName }: { host: Host; teamName?: string }) {
  const navigate = useNavigate();
  const deleteHost = useDeleteHost();
  const openSshSession = useSessionStore((s) => s.openSshSession);

  function connect() {
    openSshSession({ id: host.id, name: host.name, color: host.color });
    navigate("/sessions");
  }

  return (
    <div className="group flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 hover:border-slate-700 hover:bg-slate-900/80 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0 ring-4"
            style={{
              backgroundColor: host.color ?? DEFAULT_HOST_COLOR,
              boxShadow: `0 0 0 4px ${(host.color ?? DEFAULT_HOST_COLOR)}1a`,
            }}
          />
          <span className="font-medium text-white truncate">{host.name}</span>
          {teamName && (
            <span className="text-[11px] uppercase tracking-wide text-brand-300 bg-brand-900/40 border border-brand-800 rounded px-1.5 py-0.5">
              {teamName}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500 truncate font-mono">
          {host.username}@{host.hostname}:{host.port}
        </div>
        <div className="flex gap-1 mt-1">
          {host.tags.map((t) => (
            <span key={t} className="text-[11px] text-slate-400 bg-slate-800 rounded px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-slate-500 hidden sm:inline mr-2">{timeAgo(host.lastConnectedAt)}</span>
        <button
          onClick={() => navigate(`/hosts/${host.id}/edit`)}
          title="Edit"
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${host.name}"?`)) deleteHost.mutate(host.id);
          }}
          title="Delete"
          className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          onClick={connect}
          className="ml-1 inline-flex items-center gap-1.5 text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-md transition-colors shadow shadow-brand-900/30"
        >
          <TerminalIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
          Connect
        </button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { data: hosts, isLoading } = useHosts();
  const { data: teams } = useTeams();
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"export" | "import" | null>(null);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams ?? []) map.set(t.id, t.name);
    return map;
  }, [teams]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const h of hosts ?? []) for (const t of h.tags) set.add(t);
    return Array.from(set).sort();
  }, [hosts]);

  const filtered = useMemo(() => {
    return (hosts ?? []).filter((h) => {
      const matchesSearch =
        !search ||
        h.name.toLowerCase().includes(search.toLowerCase()) ||
        h.hostname.toLowerCase().includes(search.toLowerCase());
      const matchesTag = !tagFilter || h.tags.includes(tagFilter);
      return matchesSearch && matchesTag;
    });
  }, [hosts, search, tagFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Hosts</h1>
          <p className="text-sm text-slate-500">Your saved connections, personal and shared.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDialog("import")}
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white px-3 py-2 rounded-md transition-colors"
          >
            <Upload className="h-3.5 w-3.5" strokeWidth={2} />
            Import
          </button>
          <button
            onClick={() => setDialog("export")}
            className="inline-flex items-center gap-1.5 text-sm text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white px-3 py-2 rounded-md transition-colors"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Export
          </button>
          <Link
            to="/hosts/new"
            className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow shadow-brand-900/30"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            New host
          </Link>
        </div>
      </div>

      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
      {dialog === "import" && <ImportDialog onClose={() => setDialog(null)} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" strokeWidth={2} />
          <input
            placeholder="Search hosts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-md bg-slate-900 border border-slate-800 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
          />
        </div>
        {allTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
            className={[
              "text-xs rounded-full px-3 py-1 border",
              tagFilter === tag
                ? "bg-brand-600 border-brand-600 text-white"
                : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500",
            ].join(" ")}
          >
            {tag}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading hosts…</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
          <TerminalIcon className="h-6 w-6 text-slate-600 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-slate-400">No hosts yet.</p>
          <Link to="/hosts/new" className="text-brand-400 hover:text-brand-300 text-sm">
            Add your first host
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((h) => (
          <HostRow key={h.id} host={h} teamName={h.ownerTeamId ? teamNameById.get(h.ownerTeamId) : undefined} />
        ))}
      </div>
    </div>
  );
}
