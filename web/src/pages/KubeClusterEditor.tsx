import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useCreateKubeCluster,
  useKubeCluster,
  useSetKubeconfig,
  useTeams,
  useUpdateKubeCluster,
} from "../lib/hooks";
import { ApiError } from "../lib/api";
import { HOST_COLORS } from "../lib/colors";

export function KubeClusterEditor() {
  const { clusterId } = useParams();
  const isEditing = !!clusterId;
  const navigate = useNavigate();
  const { data: existing } = useKubeCluster(clusterId);
  const { data: teams } = useTeams();
  const createCluster = useCreateKubeCluster();
  const updateCluster = useUpdateKubeCluster(clusterId ?? "");
  const setKubeconfig = useSetKubeconfig();

  const [name, setName] = useState("");
  const [defaultNamespace, setDefaultNamespace] = useState("");
  const [kubeconfig, setKubeconfigText] = useState("");
  const [tags, setTags] = useState("");
  const [folder, setFolder] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDefaultNamespace(existing.defaultNamespace ?? "");
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
        defaultNamespace: defaultNamespace || null,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        folder: folder || null,
        color,
        teamId: teamId || null,
      };

      let id = clusterId;
      if (isEditing) {
        await updateCluster.mutateAsync(input);
      } else {
        const created = await createCluster.mutateAsync(input);
        id = created.id;
      }

      if (kubeconfig.trim() && id) {
        await setKubeconfig.mutateAsync({ clusterId: id, kubeconfig: kubeconfig.trim() });
      }

      navigate("/kubernetes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-semibold text-white mb-4">{isEditing ? "Edit cluster" : "New Kubernetes cluster"}</h1>
      <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production cluster"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Default namespace (optional)</label>
          <input
            value={defaultNamespace}
            onChange={(e) => setDefaultNamespace(e.target.value)}
            placeholder="default"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Kubeconfig</label>
          <textarea
            value={kubeconfig}
            onChange={(e) => setKubeconfigText(e.target.value)}
            placeholder={isEditing ? "Leave blank to keep the current kubeconfig" : "apiVersion: v1\nkind: Config\n..."}
            rows={8}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-slate-500">Stored encrypted (AES-256-GCM) and only decrypted server-side when you connect.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-400">Tags (comma separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="prod, eks"
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
            {submitting ? "Saving…" : "Save cluster"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/kubernetes")}
            className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-md hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
