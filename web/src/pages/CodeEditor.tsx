import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { useHosts, useKubeClusters, useKubeNamespaces, useKubePods } from "../lib/hooks";
import { sshAdapter, kubeAdapter, type FileSystemAdapter } from "../lib/fileSystemAdapter";
import { languageForPath } from "../lib/editorLanguage";
import { sshSocketUrl, kubeExecSocketUrl } from "../lib/ws";
import { FileTree } from "../components/FileTree";
import { Terminal } from "../components/Terminal";
import "../lib/monaco";

interface OpenFile {
  path: string;
  content: string;
  dirty: boolean;
}

type Target =
  | { kind: "ssh"; key: string; adapter: FileSystemAdapter; hostId: string }
  | {
      kind: "kube";
      key: string;
      adapter: FileSystemAdapter;
      clusterId: string;
      namespace: string;
      pod: string;
      container: string;
    };

function TargetPicker({ onSelect }: { onSelect: (target: Target) => void }) {
  const [kind, setKind] = useState<"ssh" | "kube">("ssh");
  const { data: hosts } = useHosts();
  const { data: clusters } = useKubeClusters();

  const [hostId, setHostId] = useState("");
  const [clusterId, setClusterId] = useState("");
  const [namespace, setNamespace] = useState("");
  const [pod, setPod] = useState("");
  const [container, setContainer] = useState("");

  const { data: namespaces } = useKubeNamespaces(kind === "kube" ? clusterId : undefined);
  const { data: pods } = useKubePods(kind === "kube" ? clusterId : undefined, namespace || undefined);
  const selectedPod = pods?.find((p) => p.name === pod);

  function open() {
    if (kind === "ssh" && hostId) {
      onSelect({ kind: "ssh", key: `ssh:${hostId}`, adapter: sshAdapter(hostId), hostId });
    } else if (kind === "kube" && clusterId && namespace && pod && container) {
      onSelect({
        kind: "kube",
        key: `kube:${clusterId}:${namespace}:${pod}:${container}`,
        adapter: kubeAdapter(clusterId, namespace, pod, container),
        clusterId,
        namespace,
        pod,
        container,
      });
    }
  }

  const canOpen = kind === "ssh" ? !!hostId : !!(clusterId && namespace && pod && container);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 max-w-2xl">
      <div className="flex gap-2">
        <button
          onClick={() => setKind("ssh")}
          className={["text-sm px-3 py-1.5 rounded-md border", kind === "ssh" ? "bg-brand-600 border-brand-600 text-white" : "border-slate-700 text-slate-400"].join(" ")}
        >
          SSH host
        </button>
        <button
          onClick={() => setKind("kube")}
          className={["text-sm px-3 py-1.5 rounded-md border", kind === "kube" ? "bg-brand-600 border-brand-600 text-white" : "border-slate-700 text-slate-400"].join(" ")}
        >
          Kubernetes pod
        </button>
      </div>

      {kind === "ssh" ? (
        <select
          value={hostId}
          onChange={(e) => setHostId(e.target.value)}
          className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white"
        >
          <option value="">Select a host…</option>
          {hosts?.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.username}@{h.hostname})
            </option>
          ))}
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={clusterId}
            onChange={(e) => {
              setClusterId(e.target.value);
              setNamespace("");
              setPod("");
              setContainer("");
            }}
            className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white"
          >
            <option value="">Cluster…</option>
            {clusters?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={namespace}
            onChange={(e) => {
              setNamespace(e.target.value);
              setPod("");
              setContainer("");
            }}
            disabled={!clusterId}
            className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white disabled:opacity-50"
          >
            <option value="">Namespace…</option>
            {namespaces?.map((ns) => (
              <option key={ns} value={ns}>
                {ns}
              </option>
            ))}
          </select>
          <select
            value={pod}
            onChange={(e) => {
              setPod(e.target.value);
              setContainer("");
            }}
            disabled={!namespace}
            className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white disabled:opacity-50"
          >
            <option value="">Pod…</option>
            {pods?.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={container}
            onChange={(e) => setContainer(e.target.value)}
            disabled={!selectedPod}
            className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white disabled:opacity-50"
          >
            <option value="">Container…</option>
            {selectedPod?.containers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        onClick={open}
        disabled={!canOpen}
        className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md"
      >
        Open
      </button>
    </div>
  );
}

export function CodeEditor() {
  const [target, setTarget] = useState<Target | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [loadingPath, setLoadingPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  const terminalSocketUrl = useMemo(() => {
    if (!target) return null;
    return target.kind === "ssh"
      ? sshSocketUrl(target.hostId)
      : kubeExecSocketUrl(target.clusterId, target.namespace, target.pod, target.container);
  }, [target]);

  useEffect(() => {
    setOpenFiles([]);
    setActivePath(null);
    setError(null);
  }, [target?.key]);

  const activeFile = useMemo(() => openFiles.find((f) => f.path === activePath) ?? null, [openFiles, activePath]);

  function openFile(path: string) {
    if (!target) return;
    const existing = openFiles.find((f) => f.path === path);
    if (existing) {
      setActivePath(path);
      return;
    }
    setLoadingPath(path);
    setError(null);
    target.adapter
      .read(path)
      .then((content) => {
        setOpenFiles((files) => [...files, { path, content, dirty: false }]);
        setActivePath(path);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not open file"))
      .finally(() => setLoadingPath(null));
  }

  function closeTab(path: string) {
    const file = openFiles.find((f) => f.path === path);
    if (file?.dirty && !confirm(`Discard unsaved changes to "${path.split("/").pop()}"?`)) return;
    setOpenFiles((files) => files.filter((f) => f.path !== path));
    if (activePath === path) {
      const remaining = openFiles.filter((f) => f.path !== path);
      setActivePath(remaining[remaining.length - 1]?.path ?? null);
    }
  }

  async function save() {
    if (!target || !activeFile) return;
    setSaving(true);
    setError(null);
    try {
      await target.adapter.write(activeFile.path, activeFile.content);
      setOpenFiles((files) => files.map((f) => (f.path === activeFile.path ? { ...f, dirty: false } : f)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save file");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, activeFile]);

  if (!target) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-white">Editor</h1>
          <p className="text-sm text-slate-500">Pick a host or pod to browse and edit its files.</p>
        </div>
        <TargetPicker onSelect={setTarget} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] gap-3">
      <div className="shrink-0 flex items-center justify-between">
        <button onClick={() => setTarget(null)} className="text-sm text-slate-400 hover:text-white">
          ← Change target
        </button>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            onClick={() => setShowTerminal((s) => !s)}
            className={[
              "text-xs px-2.5 py-1 rounded-md border",
              showTerminal ? "bg-slate-800 border-slate-700 text-white" : "border-slate-700 text-slate-400 hover:text-white",
            ].join(" ")}
          >
            Terminal
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
          <div className="w-64 shrink-0 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-2">
            <FileTree key={target.key} adapter={target.adapter} onOpenFile={openFile} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="shrink-0 flex items-center gap-1 border-b border-slate-800 overflow-x-auto">
              {openFiles.map((f) => (
                <div
                  key={f.path}
                  onClick={() => setActivePath(f.path)}
                  className={[
                    "flex items-center gap-2 px-3 py-2 text-sm border-r border-slate-800 cursor-pointer shrink-0",
                    f.path === activePath ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900",
                  ].join(" ")}
                >
                  <span className="truncate max-w-[12rem]">
                    {f.dirty && "• "}
                    {f.path.split("/").pop()}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(f.path);
                    }}
                    className="text-slate-500 hover:text-white"
                  >
                    ×
                  </span>
                </div>
              ))}
              {activeFile && (
                <button
                  onClick={save}
                  disabled={saving}
                  className="ml-auto mr-2 my-1 shrink-0 text-xs font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0">
              {loadingPath && !activeFile && (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading…</div>
              )}
              {activeFile && (
                <Editor
                  height="100%"
                  theme="vs-dark"
                  language={languageForPath(activeFile.path)}
                  value={activeFile.content}
                  onChange={(value) =>
                    setOpenFiles((files) =>
                      files.map((f) => (f.path === activeFile.path ? { ...f, content: value ?? "", dirty: true } : f))
                    )
                  }
                  options={{ minimap: { enabled: false }, fontSize: 13 }}
                />
              )}
              {!activeFile && !loadingPath && (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                  Select a file from the tree to open it.
                </div>
              )}
            </div>
          </div>
        </div>

        {showTerminal && terminalSocketUrl && (
          <div className="h-64 shrink-0">
            <Terminal socketUrl={terminalSocketUrl} active />
          </div>
        )}
      </div>
    </div>
  );
}
