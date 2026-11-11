import { lazy, Suspense, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Boxes, ChevronDown, FileCode2, Pencil, Plus, Terminal as TerminalIcon, Trash2 } from "lucide-react";
import {
  useDeleteKubeCluster,
  useKubeClusters,
  useKubeNamespaces,
  useKubePods,
  useTeams,
} from "../lib/hooks";
import { useSessionStore } from "../lib/sessionStore";
import { DEFAULT_HOST_COLOR } from "../lib/colors";
import { api, ApiError, type KubeCluster } from "../lib/api";

const FileEditorModal = lazy(() =>
  import("../components/FileEditorModal").then((m) => ({ default: m.FileEditorModal }))
);

function PodPicker({ cluster }: { cluster: KubeCluster }) {
  const navigate = useNavigate();
  const openKubeSession = useSessionStore((s) => s.openKubeSession);
  const [namespace, setNamespace] = useState(cluster.defaultNamespace ?? "");
  const [pod, setPod] = useState("");
  const [container, setContainer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState("");
  const [editingPath, setEditingPath] = useState<string | null>(null);

  const { data: namespaces, isLoading: loadingNs, error: nsError } = useKubeNamespaces(cluster.id);
  const { data: pods, isLoading: loadingPods, error: podError } = useKubePods(cluster.id, namespace || undefined);

  const selectedPod = pods?.find((p) => p.name === pod);

  async function loadFile(targetPath: string) {
    const qs = new URLSearchParams({ namespace, pod, container, path: targetPath });
    const res = await fetch(`/api/kube-clusters/${cluster.id}/file?${qs}`, { credentials: "include" });
    if (!res.ok) {
      let message = res.statusText;
      try {
        const body = await res.json();
        message = typeof body.error === "string" ? body.error : message;
      } catch {
        // no json body
      }
      throw new Error(message);
    }
    return res.text();
  }

  async function saveFile(targetPath: string, content: string) {
    const qs = new URLSearchParams({ namespace, pod, container, path: targetPath });
    await api.put(`/api/kube-clusters/${cluster.id}/file?${qs}`, { content });
  }

  function connect() {
    if (!namespace || !pod || !container) {
      setError("Pick a namespace, pod, and container first");
      return;
    }
    openKubeSession({
      clusterId: cluster.id,
      clusterName: cluster.name,
      clusterColor: cluster.color,
      namespace,
      pod,
      container,
    });
    navigate("/sessions");
  }

  return (
    <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 space-y-3">
      {(nsError || podError) && (
        <p className="text-sm text-red-400">
          {nsError instanceof ApiError ? nsError.message : podError instanceof ApiError ? podError.message : "Could not reach cluster"}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            value: namespace,
            onChange: (v: string) => {
              setNamespace(v);
              setPod("");
              setContainer("");
            },
            placeholder: loadingNs ? "Loading…" : "Namespace",
            options: namespaces,
            disabled: false,
          },
          {
            value: pod,
            onChange: (v: string) => {
              setPod(v);
              setContainer("");
            },
            placeholder: loadingPods ? "Loading…" : "Pod",
            options: pods?.map((p) => p.name),
            disabled: !namespace,
          },
          {
            value: container,
            onChange: setContainer,
            placeholder: "Container",
            options: selectedPod?.containers,
            disabled: !selectedPod,
          },
        ].map((field, i) => (
          <div key={i} className="relative">
            <select
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              disabled={field.disabled}
              className="w-full appearance-none rounded-md bg-slate-800 border border-slate-700 pl-2 pr-7 py-1.5 text-sm text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            >
              <option value="">{field.placeholder}</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" strokeWidth={2} />
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={connect}
          className="inline-flex items-center gap-1.5 text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-md transition-colors shadow shadow-brand-900/30"
        >
          <TerminalIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
          Connect
        </button>
        {container && (
          <>
            <input
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="/path/to/file to edit"
              className="flex-1 rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
            />
            <button
              onClick={() => filePath && setEditingPath(filePath)}
              disabled={!filePath}
              className="inline-flex items-center gap-1.5 text-sm text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors"
            >
              <FileCode2 className="h-3.5 w-3.5" strokeWidth={2} />
              Open file
            </button>
          </>
        )}
      </div>

      {editingPath && (
        <Suspense fallback={null}>
          <FileEditorModal
            path={editingPath}
            load={() => loadFile(editingPath)}
            onSave={(content) => saveFile(editingPath, content)}
            onClose={() => setEditingPath(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

function KubeClusterRow({ cluster, teamName }: { cluster: KubeCluster; teamName?: string }) {
  const navigate = useNavigate();
  const deleteCluster = useDeleteKubeCluster();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden hover:border-slate-700 transition-colors">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <button className="min-w-0 text-left" onClick={() => setExpanded((e) => !e)}>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: cluster.color ?? DEFAULT_HOST_COLOR,
                boxShadow: `0 0 0 4px ${(cluster.color ?? DEFAULT_HOST_COLOR)}1a`,
              }}
            />
            <span className="font-medium text-white truncate">{cluster.name}</span>
            {teamName && (
              <span className="text-[11px] uppercase tracking-wide text-brand-300 bg-brand-900/40 border border-brand-800 rounded px-1.5 py-0.5">
                {teamName}
              </span>
            )}
          </div>
          <div className="text-sm text-slate-500 truncate font-mono">{cluster.defaultNamespace ?? "No default namespace"}</div>
          <div className="flex gap-1 mt-1">
            {cluster.tags.map((t) => (
              <span key={t} className="text-[11px] text-slate-400 bg-slate-800 rounded px-1.5 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => navigate(`/kubernetes/${cluster.id}/edit`)}
            title="Edit"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Pencil className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${cluster.name}"?`)) deleteCluster.mutate(cluster.id);
            }}
            title="Delete"
            className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="ml-1 inline-flex items-center gap-1.5 text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-md transition-colors shadow shadow-brand-900/30"
          >
            <TerminalIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
            {expanded ? "Close" : "Connect"}
          </button>
        </div>
      </div>
      {expanded && <PodPicker cluster={cluster} />}
    </div>
  );
}

export function KubeClusters() {
  const { data: clusters, isLoading } = useKubeClusters();
  const { data: teams } = useTeams();

  const teamNameById = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Kubernetes clusters</h1>
          <p className="text-sm text-slate-500">Connect a kubeconfig, then shell into any pod.</p>
        </div>
        <Link
          to="/kubernetes/new"
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow shadow-brand-900/30"
        >
          <Plus className="h-4 w-4" strokeWidth={2.25} />
          New cluster
        </Link>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading clusters…</p>}

      {!isLoading && (clusters ?? []).length === 0 && (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-xl">
          <Boxes className="h-6 w-6 text-slate-600 mx-auto mb-2" strokeWidth={1.5} />
          <p className="text-slate-400">No clusters yet.</p>
          <Link to="/kubernetes/new" className="text-brand-400 hover:text-brand-300 text-sm">
            Add your first cluster
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {(clusters ?? []).map((c) => (
          <KubeClusterRow key={c.id} cluster={c} teamName={c.ownerTeamId ? teamNameById.get(c.ownerTeamId) : undefined} />
        ))}
      </div>
    </div>
  );
}
