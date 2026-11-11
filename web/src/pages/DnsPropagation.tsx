import { FormEvent, useState } from "react";
import { AlertTriangle, CheckCircle2, Waypoints, XCircle } from "lucide-react";
import { useDnsPropagation } from "../lib/hooks";
import { ApiError } from "../lib/api";
import type { DnsRecordType } from "../lib/api";

const RECORD_TYPES: DnsRecordType[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS"];

export function DnsPropagation() {
  const [target, setTarget] = useState("");
  const [recordType, setRecordType] = useState<DnsRecordType>("A");
  const [error, setError] = useState<string | null>(null);
  const check = useDnsPropagation();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await check.mutateAsync({ target: target.trim(), recordType });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Check failed");
    }
  }

  const result = check.data;
  const matchCount = result ? result.results.filter((r) => r.values && !r.error).length : 0;
  const consensusKey = result?.consensus?.join(",") ?? null;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Waypoints className="h-5 w-5 text-brand-400" strokeWidth={2} />
          DNS propagation checker
        </h1>
        <p className="text-sm text-slate-500">
          Query a domain against several major public DNS resolvers to see whether a change has propagated everywhere yet.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Domain</label>
          <input
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="s3.neoscoder.com"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {RECORD_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setRecordType(t)}
              className={[
                "text-xs font-mono rounded-md px-3 py-1.5 border transition-colors",
                recordType === t
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "border-slate-700 text-slate-400 hover:text-white hover:border-slate-500",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={check.isPending}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow shadow-brand-900/30"
        >
          <Waypoints className={["h-4 w-4", check.isPending ? "animate-pulse" : ""].join(" ")} strokeWidth={2.25} />
          {check.isPending ? "Checking…" : "Check propagation"}
        </button>
      </form>

      {result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-white font-medium font-mono">{result.target}</span>
              <span className="text-slate-500"> — {result.recordType}</span>
            </div>
            <div className="text-xs text-slate-500">
              {matchCount}/{result.results.length} resolvers agree
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 divide-y divide-slate-800 overflow-hidden">
            {result.results.map((r) => {
              const matches = r.values && r.values.join(",") === consensusKey;
              const Icon = r.error ? XCircle : matches ? CheckCircle2 : AlertTriangle;
              const iconClass = r.error ? "text-red-400" : matches ? "text-emerald-400" : "text-amber-400";
              return (
                <div key={r.ip} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={["h-4 w-4 shrink-0", iconClass].join(" ")} strokeWidth={2} />
                    <div className="min-w-0">
                      <div className="text-sm text-white truncate">{r.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{r.ip}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {r.error ? (
                      <span className="text-xs text-red-400">{r.error}</span>
                    ) : (
                      <div className="font-mono text-sm text-slate-200">
                        {r.values!.map((v, i) => (
                          <div key={i}>{v}</div>
                        ))}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-600">{r.latencyMs}ms</div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600">
            These are distinct public resolver infrastructures, not physical probes in different countries — a mismatch
            means that provider's cache hasn't picked up the change yet, which is still a useful propagation signal.
          </p>
        </div>
      )}
    </div>
  );
}
