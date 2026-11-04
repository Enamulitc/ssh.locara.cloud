import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SftpEntry } from "../lib/api";

function joinPath(dir: string, name: string) {
  return `${dir.replace(/\/$/, "")}/${name}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function SftpBrowser({ hostId }: { hostId: string }) {
  const [path, setPath] = useState("/");
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: entries, isLoading, error } = useQuery({
    queryKey: ["sftp", hostId, path],
    queryFn: () => api.get<SftpEntry[]>(`/api/hosts/${hostId}/sftp/list?path=${encodeURIComponent(path)}`),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("path", path);
      form.append("file", file);
      return api.postForm(`/api/hosts/${hostId}/sftp/upload`, form);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sftp", hostId, path] }),
  });

  const remove = useMutation({
    mutationFn: (entry: SftpEntry) =>
      api.delete(`/api/hosts/${hostId}/sftp/item`, {
        path: joinPath(path, entry.name),
        isDirectory: entry.type === "directory",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sftp", hostId, path] }),
  });

  const mkdir = useMutation({
    mutationFn: (dirName: string) => api.post(`/api/hosts/${hostId}/sftp/mkdir`, { path: joinPath(path, dirName) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sftp", hostId, path] }),
  });

  function download(entry: SftpEntry) {
    const url = `/api/hosts/${hostId}/sftp/download?path=${encodeURIComponent(joinPath(path, entry.name))}`;
    window.open(url, "_blank");
  }

  const segments = path.split("/").filter(Boolean);

  return (
    <div className="flex flex-col h-full rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-1 text-sm text-slate-400 overflow-x-auto">
          <button onClick={() => setPath("/")} className="hover:text-white">
            /
          </button>
          {segments.map((seg, i) => (
            <span key={i} className="flex items-center gap-1">
              <button onClick={() => setPath("/" + segments.slice(0, i + 1).join("/"))} className="hover:text-white">
                {seg}
              </button>
              {i < segments.length - 1 && <span>/</span>}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              const name = prompt("New folder name");
              if (name) mkdir.mutate(name);
            }}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
          >
            New folder
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-2 py-1 rounded"
          >
            Upload
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="text-sm text-slate-500 px-3 py-3">Loading…</p>}
        {error && <p className="text-sm text-red-400 px-3 py-3">Could not list directory.</p>}
        {entries?.length === 0 && <p className="text-sm text-slate-500 px-3 py-3">Empty directory.</p>}
        {entries?.map((entry) => (
          <div
            key={entry.name}
            className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-slate-900 text-sm group"
          >
            <button
              className="flex-1 text-left truncate text-slate-200 disabled:text-slate-400"
              disabled={entry.type !== "directory"}
              onClick={() => entry.type === "directory" && setPath(joinPath(path, entry.name))}
            >
              {entry.type === "directory" ? "📁" : "📄"} {entry.name}
            </button>
            <span className="text-xs text-slate-500 w-16 text-right shrink-0">
              {entry.type === "file" ? formatSize(entry.size) : ""}
            </span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              {entry.type !== "directory" && (
                <button onClick={() => download(entry)} className="text-xs text-slate-400 hover:text-white px-1.5">
                  Download
                </button>
              )}
              <button onClick={() => remove.mutate(entry)} className="text-xs text-red-400 hover:text-red-300 px-1.5">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
