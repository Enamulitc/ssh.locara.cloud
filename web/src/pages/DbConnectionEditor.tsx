import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreateDbConnection,
  useDbConnection,
  useHosts,
  useSetDbCredential,
  useTeams,
  useUpdateDbConnection,
} from "../lib/hooks";
import { ApiError, type DbEngine } from "../lib/api";
import { HOST_COLORS } from "../lib/colors";

const ENGINE_DEFAULT_PORT: Record<DbEngine, number> = { MYSQL: 3306, POSTGRES: 5432 };

export function DbConnectionEditor() {
  const { connectionId } = useParams();
  const isEditing = !!connectionId;
  const navigate = useNavigate();
  const { data: existing } = useDbConnection(connectionId);
  const { data: teams } = useTeams();
  const { data: hosts } = useHosts();
  const createConnection = useCreateDbConnection();
  const updateConnection = useUpdateDbConnection(connectionId ?? "");
  const setCredential = useSetDbCredential();

  const [name, setName] = useState("");
  const [engine, setEngine] = useState<DbEngine>("POSTGRES");
  const [hostname, setHostname] = useState("");
  const [port, setPort] = useState(ENGINE_DEFAULT_PORT.POSTGRES);
  const [database, setDatabase] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tunnelHostId, setTunnelHostId] = useState("");
  const [tags, setTags] = useState("");
  const [folder, setFolder] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setEngine(existing.engine);
    setHostname(existing.hostname);
    setPort(existing.port);
    setDatabase(existing.database);
    setUsername(existing.username);
    setTunnelHostId(existing.tunnelHostId ?? "");
    setTags(existing.tags.join(", "));
    setFolder(existing.folder ?? "");
    setColor(existing.color ?? null);
    setTeamId(existing.ownerTeamId ?? "");
  }, [existing]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const input = {
        name,
        engine,
        hostname,
        port,
        database,
        username,
        tunnelHostId: tunnelHostId || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        folder: folder || null,
        color,
        teamId: teamId || null,
      };

      let id = connectionId;
      if (isEditing) {
        await updateConnection.mutateAsync(input);
      } else {
        const created = await createConnection.mutateAsync(input);
        id = created.id;
      }

      if (password.trim() && id) {
        await setCredential.mutateAsync({ connectionId: id, password: password.trim() });
      }

      navigate("/databases");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-4">
        {isEditing ? "Edit database connection" : "New database connection"}
      </h1>
      <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production Postgres"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Engine</label>
          <select
            value={engine}
            onChange={(e) => {
              const next = e.target.value as DbEngine;
              setEngine(next);
              setPort((prev) => (prev === ENGINE_DEFAULT_PORT[engine] ? ENGINE_DEFAULT_PORT[next] : prev));
            }}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="POSTGRES">PostgreSQL</option>
            <option value="MYSQL">MySQL</option>
          </select>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Hostname</label>
            <input
              required
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="db.internal"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Port</label>
            <input
              type="number"
              required
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="w-24 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Database</label>
            <input
              required
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Username</label>
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEditing ? "Leave blank to keep the current password" : ""}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-500">Stored encrypted (AES-256-GCM) and only decrypted server-side when you connect.</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Tunnel through SSH host (optional)</label>
          <select
            value={tunnelHostId}
            onChange={(e) => setTunnelHostId(e.target.value)}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Connect directly</option>
            {(hosts ?? []).map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.username}@{h.hostname})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Use this when the database is only reachable from that host's network (e.g. a jump box).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Tags (comma separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="prod, payments"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Folder</label>
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="Clients / Acme"
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Tab color</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setColor(null)}
              title="No color"
              className={[
                "h-7 w-7 rounded-full border-2 flex items-center justify-center text-slate-500 bg-slate-800",
                color === null ? "border-white" : "border-transparent",
              ].join(" ")}
            >
              ∅
            </button>
            {HOST_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                title={c.name}
                style={{ backgroundColor: c.value }}
                className={[
                  "h-7 w-7 rounded-full border-2",
                  color === c.value ? "border-white" : "border-transparent",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Visibility</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Personal (only me)</option>
            {(teams ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                Shared with {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow shadow-brand-900/30"
          >
            {submitting ? "Saving…" : "Save connection"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/databases")}
            className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-md hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
