import { FormEvent, useState } from "react";
import { Fingerprint } from "lucide-react";
import { useWhois } from "../lib/hooks";
import { ApiError } from "../lib/api";

export function IpChecker() {
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const whois = useWhois();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await whois.mutateAsync(target.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lookup failed");
    }
  }

  const result = whois.data;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-brand-400" strokeWidth={2} />
          IP checker
        </h1>
        <p className="text-sm text-slate-500">
          Look up who owns an IP or domain — organization, network range, ASN, country — via WHOIS.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm text-slate-400">IP or domain</label>
          <input
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="8.8.8.8 or example.com"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={whois.isPending}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow shadow-brand-900/30"
        >
          <Fingerprint className={["h-4 w-4", whois.isPending ? "animate-pulse" : ""].join(" ")} strokeWidth={2.25} />
          {whois.isPending ? "Checking…" : "Check"}
        </button>
      </form>

      {result && (
        <div className="rounded-lg border border-slate-800 bg-[#020617] overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-800 text-xs text-slate-500 font-mono">
            {result.queriedServers.join(" → ")}
          </div>
          <pre className="p-4 text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[32rem] overflow-y-auto">
            {result.text}
          </pre>
        </div>
      )}
    </div>
  );
}
