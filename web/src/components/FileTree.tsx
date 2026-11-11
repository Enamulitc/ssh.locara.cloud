import { useEffect, useState } from "react";
import type { FileSystemAdapter, FsEntry } from "../lib/fileSystemAdapter";

function joinPath(dir: string, name: string) {
  return `${dir.replace(/\/$/, "")}/${name}`;
}

function sortEntries(entries: FsEntry[]): FsEntry[] {
  return [...entries].sort((a, b) =>
    a.type !== b.type ? (a.type === "directory" ? -1 : 1) : a.name.localeCompare(b.name)
  );
}

export function FileTree({
  adapter,
  root = "/",
  onOpenFile,
}: {
  adapter: FileSystemAdapter;
  root?: string;
  onOpenFile: (path: string) => void;
}) {
  const [children, setChildren] = useState<Record<string, FsEntry[] | "loading" | "error">>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set([root]));

  function loadDir(path: string) {
    setChildren((c) => ({ ...c, [path]: "loading" }));
    adapter
      .list(path)
      .then((entries) => setChildren((c) => ({ ...c, [path]: sortEntries(entries) })))
      .catch(() => setChildren((c) => ({ ...c, [path]: "error" })));
  }

  useEffect(() => {
    setChildren({});
    setExpanded(new Set([root]));
    loadDir(root);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, root]);

  function toggle(path: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
        if (!children[path]) loadDir(path);
      }
      return next;
    });
  }

  function renderEntries(path: string, depth: number) {
    const state = children[path];
    if (state === "loading") {
      return (
        <div style={{ paddingLeft: depth * 14 + 8 }} className="text-xs text-slate-500 py-1">
          Loading…
        </div>
      );
    }
    if (state === "error") {
      return (
        <div style={{ paddingLeft: depth * 14 + 8 }} className="text-xs text-red-400 py-1">
          Could not list directory
        </div>
      );
    }
    if (!state) return null;

    return state.map((entry) => {
      const entryPath = joinPath(path, entry.name);
      const isOpen = expanded.has(entryPath);
      return (
        <div key={entryPath}>
          <button
            onClick={() => (entry.type === "directory" ? toggle(entryPath) : onOpenFile(entryPath))}
            style={{ paddingLeft: depth * 14 + 8 }}
            className="w-full text-left truncate text-sm text-slate-300 hover:bg-slate-800 py-1 rounded"
          >
            {entry.type === "directory" ? (isOpen ? "📂" : "📁") : "📄"} {entry.name}
          </button>
          {entry.type === "directory" && isOpen && renderEntries(entryPath, depth + 1)}
        </div>
      );
    });
  }

  return <div className="text-sm py-1">{renderEntries(root, 0)}</div>;
}
