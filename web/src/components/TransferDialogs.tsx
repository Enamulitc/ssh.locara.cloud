import { FormEvent, useRef, useState } from "react";
import { useExportHosts, useImportHosts } from "../lib/hooks";
import { ApiError, type ExportFile } from "../lib/api";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const exportHosts = useExportHosts();
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases don't match");
      return;
    }
    try {
      const result = await exportHosts.mutateAsync(passphrase);
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `locara-ssh-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <Modal title="Export hosts" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-400">
          Exports your personal hosts and credentials into an encrypted file. Choose a passphrase — you'll need it
          again to import, so don't lose it. Team-shared hosts aren't included.
        </p>
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm text-slate-400">Passphrase</label>
          <input
            type="password"
            required
            minLength={8}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-400">Confirm passphrase</label>
          <input
            type="password"
            required
            value={confirmPassphrase}
            onChange={(e) => setConfirmPassphrase(e.target.value)}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={exportHosts.isPending}
          className="w-full rounded-md bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2"
        >
          {exportHosts.isPending ? "Exporting…" : "Download export file"}
        </button>
      </form>
    </Modal>
  );
}

export function ImportDialog({ onClose }: { onClose: () => void }) {
  const importHosts = useImportHosts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileData, setFileData] = useState<ExportFile | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportFile;
      if (parsed.app !== "locara-ssh" || !parsed.file) throw new Error("not a locara-ssh export");
      setFileData(parsed);
      setFileName(file.name);
    } catch {
      setError("That doesn't look like a Locara SSH export file.");
      setFileData(null);
      setFileName(null);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fileData) return;
    setError(null);
    try {
      const res = await importHosts.mutateAsync({ passphrase, file: fileData.file });
      setResult(res.imported);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  if (result !== null) {
    return (
      <Modal title="Import hosts" onClose={onClose}>
        <p className="text-sm text-slate-300">
          Imported {result} host{result === 1 ? "" : "s"}.
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium py-2"
        >
          Done
        </button>
      </Modal>
    );
  }

  return (
    <Modal title="Import hosts" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-slate-400">Pick an export file from another Locara SSH instance and its passphrase.</p>
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm text-slate-400">Export file</label>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={onFileChange} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            {fileName ?? "Choose file…"}
          </button>
        </div>
        <div className="space-y-1">
          <label className="text-sm text-slate-400">Passphrase</label>
          <input
            type="password"
            required
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={!fileData || importHosts.isPending}
          className="w-full rounded-md bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium py-2"
        >
          {importHosts.isPending ? "Importing…" : "Import"}
        </button>
      </form>
    </Modal>
  );
}
