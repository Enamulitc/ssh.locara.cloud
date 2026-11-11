import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import "../lib/monaco";
import { languageForPath } from "../lib/editorLanguage";

export function FileEditorModal({
  path,
  load,
  onSave,
  onClose,
}: {
  path: string;
  load: () => Promise<string>;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not open file");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  async function handleSave() {
    if (content === null) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(content);
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save file");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex flex-col w-full max-w-4xl h-[80vh] rounded-xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800">
          <span className="text-sm font-mono text-slate-300 truncate">{path}</span>
          <div className="flex items-center gap-2 shrink-0">
            {dirty && <span className="text-xs text-amber-400">Unsaved changes</span>}
            <button
              onClick={handleSave}
              disabled={loading || saving || content === null}
              className="text-sm font-medium bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-md"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-md px-2 py-1.5 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {error && (
          <p className="shrink-0 text-sm text-red-400 bg-red-950/40 border-b border-red-900 px-4 py-2">{error}</p>
        )}

        <div className="flex-1 min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading…</div>
          ) : content !== null ? (
            <Editor
              height="100%"
              theme="vs-dark"
              language={languageForPath(path)}
              value={content}
              onChange={(value) => {
                setContent(value ?? "");
                setDirty(true);
              }}
              options={{ minimap: { enabled: false }, fontSize: 13 }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
