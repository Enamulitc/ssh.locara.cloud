import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCreateHost, useHost, useSetCredential, useTeams, useUpdateHost } from "../lib/hooks";
import { ApiError, type AuthType } from "../lib/api";
import { HOST_COLORS } from "../lib/colors";

export function HostEditor() {
  const { hostId } = useParams();
  const isEditing = !!hostId;
  const navigate = useNavigate();
  const { data: existing } = useHost(hostId);
  const { data: teams } = useTeams();
  const createHost = useCreateHost();
  const updateHost = useUpdateHost(hostId ?? "");
  const setCredential = useSetCredential();

  const [name, setName] = useState("");
  const [hostname, setHostname] = useState("");
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState("");
  const [authType, setAuthType] = useState<AuthType>("PASSWORD");
  const [secret, setSecret] = useState("");
  const [tags, setTags] = useState("");
  const [folder, setFolder] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setHostname(existing.hostname);
    setPort(existing.port);
    setUsername(existing.username);
    setAuthType(existing.authType);
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
        hostname,
        port,
        username,
        authType,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        folder: folder || null,
        color,
        teamId: teamId || null,
      };

      let id = hostId;
      if (isEditing) {
        await updateHost.mutateAsync(input);
      } else {
        const created = await createHost.mutateAsync(input);
        id = created.id;
      }

      if (secret && authType !== "AGENT" && id) {
        await setCredential.mutateAsync({
          hostId: id,
          type: authType === "PRIVATE_KEY" ? "PRIVATE_KEY" : "PASSWORD",
          secret,
        });
      }

      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-4">{isEditing ? "Edit host" : "New host"}</h1>
      <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production web server"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1">
            <label className="text-sm text-slate-400">Hostname / IP</label>
            <input
              required
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              placeholder="203.0.113.10"
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
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Username</label>
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="root"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Authentication</label>
          <div className="flex gap-2">
            {(["PASSWORD", "PRIVATE_KEY", "AGENT"] as AuthType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setAuthType(t)}
                className={[
                  "flex-1 text-sm rounded-md px-3 py-2 border",
                  authType === t
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-slate-700 text-slate-400 hover:text-white",
                ].join(" ")}
              >
                {t === "PASSWORD" ? "Password" : t === "PRIVATE_KEY" ? "Private key" : "SSH agent"}
              </button>
            ))}
          </div>
        </div>

        {authType === "PASSWORD" && (
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Password</label>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={isEditing ? "Leave blank to keep current password" : ""}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        {authType === "PRIVATE_KEY" && (
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Private key</label>
            <textarea
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={isEditing ? "Leave blank to keep current key" : "-----BEGIN OPENSSH PRIVATE KEY-----"}
              rows={6}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-slate-500">Stored encrypted (AES-256-GCM) and only decrypted server-side when you connect.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Tags (comma separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="prod, api"
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
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            {submitting ? "Saving…" : "Save host"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-md hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
