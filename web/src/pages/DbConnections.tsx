import { useNavigate, Link } from "react-router-dom";
import { Database, Pencil, Plus, Terminal as TerminalIcon, Trash2 } from "lucide-react";
import { useDbConnections, useDeleteDbConnection, useTeams } from "../lib/hooks";
import { useSessionStore } from "../lib/sessionStore";
import { DEFAULT_HOST_COLOR } from "../lib/colors";
import type { DbConnection } from "../lib/api";

function DbConnectionRow({ connection, teamName }: { connection: DbConnection; teamName?: string }) {
  const navigate = useNavigate();
  const deleteConnection = useDeleteDbConnection();
  const openDbSession = useSessionStore((s) => s.openDbSession);

  function connect() {
    openDbSession({ id: connection.id, name: connection.name, color: connection.color });
    navigate("/sessions");
  }

  return (
    <div className="group flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 hover:border-slate-700 hover:bg-slate-900/80 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{
              backgroundColor: connection.color ?? DEFAULT_HOST_COLOR,
              boxShadow: `0 0 0 4px ${(connection.color ?? DEFAULT_HOST_COLOR)}1a`,
            }}
          />
          <span className="font-medium text-white truncate">{connection.name}</span>
          <span className="text-[11px] uppercase tracking-wide text-slate-400 bg-slate-800 rounded px-1.5 py-0.5">
            {connection.engine === "MYSQL" ? "MySQL" : "Postgres"}
          </span>
          {teamName && (
            <span className="text-[11px] uppercase tracking-wide text-brand-300 bg-brand-900/40 border border-brand-800 rounded px-1.5 py-0.5">
              {teamName}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500 truncate font-mono">
          {connection.username}@{connection.hostname}:{connection.port}/{connection.database}
          {connection.tunnelHostId && <span className="text-slate-600"> (via tunnel)</span>}
        </div>
        <div className="flex gap-1 mt-1">
          {connection.tags.map((t) => (
            <span key={t} className="text-[11px] text-slate-400 bg-slate-800 rounded px-1.5 py-0.5">
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => navigate(`/databases/${connection.id}/edit`)}
          title="Edit"
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${connection.name}"?`)) deleteConnection.mutate(connection.id);
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

export function DbConnections() {
  const { data: connections, isLoading } = useDbConnections();
  const { data: teams } = useTeams();

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Databases</h1>
          <p className="text-sm text-slate-500">MySQL and PostgreSQL connections, with optional SSH tunneling.</p>
        </div>
        <Link
          to="/databases/new"
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow shadow-brand-900/30"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          New connection
        </Link>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading connections…</p>}

      {!isLoading && (connections ?? []).length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
          <Database className="h-6 w-6 text-slate-600 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-slate-400">No database connections yet.</p>
          <Link to="/databases/new" className="text-brand-400 hover:text-brand-300 text-sm">
            Add your first connection
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {(connections ?? []).map((c) => (
          <DbConnectionRow key={c.id} connection={c} teamName={c.ownerTeamId ? teamNameById.get(c.ownerTeamId) : undefined} />
        ))}
      </div>
    </div>
  );
}
