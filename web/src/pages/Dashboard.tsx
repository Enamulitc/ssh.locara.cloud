import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const openSession = useSessionStore((s) => s.openSession);

  function connect() {
    openSession({ id: host.id, name: host.name, color: host.color });
    navigate("/sessions");
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 hover:border-slate-700 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: host.color ?? DEFAULT_HOST_COLOR }} />
          <span className="font-medium text-white truncate">{host.name}</span>
          {teamName && (
            <span className="text-[11px] uppercase tracking-wide text-brand-300 bg-brand-900/40 border border-brand-800 rounded px-1.5 py-0.5">
              {teamName}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500 truncate">
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
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-slate-500 hidden sm:inline">{timeAgo(host.lastConnectedAt)}</span>
        <button
          onClick={() => navigate(`/hosts/${host.id}/edit`)}
          className="text-sm text-slate-400 hover:text-white px-2 py-1.5 rounded-md hover:bg-slate-800"
        >
          Edit
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${host.name}"?`)) deleteHost.mutate(host.id);
          }}
          className="text-sm text-red-400 hover:text-red-300 px-2 py-1.5 rounded-md hover:bg-red-950/40"
        >
          Delete
        </button>
        <button
          onClick={connect}
          className="text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-md"
        >
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
            className="text-sm text-slate-300 border border-slate-700 hover:border-slate-500 px-3 py-2 rounded-md"
          >
            Import
          </button>
          <button
            onClick={() => setDialog("export")}
            className="text-sm text-slate-300 border border-slate-700 hover:border-slate-500 px-3 py-2 rounded-md"
          >
            Export
          </button>
          <Link
            to="/hosts/new"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            + New host
          </Link>
        </div>
      </div>

      {dialog === "export" && <ExportDialog onClose={() => setDialog(null)} />}
      {dialog === "import" && <ImportDialog onClose={() => setDialog(null)} />}

      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Search hosts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md bg-slate-900 border border-slate-800 px-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
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
