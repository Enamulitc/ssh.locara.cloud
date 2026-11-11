import { FormEvent, useState } from "react";
import { LockOpen, Radar, Shield, ShieldAlert } from "lucide-react";
import { usePortScan } from "../lib/hooks";
import { ApiError } from "../lib/api";
import type { PortState } from "../lib/api";

const STATE_STYLES: Record<PortState, { label: string; icon: typeof LockOpen; className: string }> = {
  open: { label: "Open", icon: LockOpen, className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  closed: { label: "Closed", icon: Shield, className: "text-slate-400 bg-slate-800 border-slate-700" },
  filtered: { label: "Filtered", icon: ShieldAlert, className: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
};

const COMMON_PORT_NAMES: Record<number, string> = {
  21: "ftp",
  22: "ssh",
  23: "telnet",
  25: "smtp",
  53: "dns",
  80: "http",
  110: "pop3",
  111: "rpcbind",
  135: "msrpc",
  139: "netbios",
  143: "imap",
  443: "https",
  445: "smb",
  465: "smtps",
  514: "syslog",
  587: "submission",
  993: "imaps",
  995: "pop3s",
  1433: "mssql",
  1521: "oracle",
  2049: "nfs",
  2375: "docker",
  3000: "dev-http",
  3306: "mysql",
  3389: "rdp",
  5000: "dev-http",
  5432: "postgres",
  5900: "vnc",
  5984: "couchdb",
  6379: "redis",
  6443: "k8s-api",
  7000: "http-alt",
  8000: "http-alt",
  8008: "http-alt",
  8080: "http-alt",
  8081: "http-alt",
  8443: "https-alt",
  8888: "http-alt",
  9000: "http-alt",
  9090: "prometheus",
  9200: "elasticsearch",
  9300: "elasticsearch",
  11211: "memcached",
  27017: "mongodb",
  27018: "mongodb",
  50000: "db2",
};

export function PortScanner() {
  const [target, setTarget] = useState("");
  const [ports, setPorts] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scan = usePortScan();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await scan.mutateAsync({ target: target.trim(), ports: ports.trim() || undefined });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Scan failed");
    }
  }

  const results = scan.data?.results ?? [];
  const openCount = results.filter((r) => r.state === "open").length;
  const filteredCount = results.filter((r) => r.state === "filtered").length;
  const closedCount = results.filter((r) => r.state === "closed").length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Radar className="h-5 w-5 text-brand-400" strokeWidth={2} />
          Port scanner
        </h1>
        <p className="text-sm text-slate-500">Check which ports on a host are open, closed, or filtered.</p>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Target (IP or domain)</label>
          <input
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="example.com or 10.0.4.12"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-400">Ports (optional)</label>
          <input
            value={ports}
            onChange={(e) => setPorts(e.target.value)}
            placeholder="22,80,443,8000-8100 — leave blank to scan common ports"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={scan.isPending}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow shadow-brand-900/30"
        >
          <Radar className={["h-4 w-4", scan.isPending ? "animate-spin" : ""].join(" ")} strokeWidth={2.25} />
          {scan.isPending ? "Scanning…" : "Scan"}
        </button>
      </form>

      {scan.data && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <span className="text-white font-medium">{scan.data.target}</span>
              {scan.data.resolvedIp !== scan.data.target && (
                <span className="font-mono text-slate-500"> ({scan.data.resolvedIp})</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="text-emerald-400">{openCount} open</span>
              <span className="text-amber-400">{filteredCount} filtered</span>
              <span>{closedCount} closed</span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-900 divide-y divide-slate-800 overflow-hidden">
            {results.map((r) => {
              const style = STATE_STYLES[r.state];
              const Icon = style.icon;
              return (
                <div key={r.port} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-white w-14">{r.port}</span>
                    <span className="text-xs text-slate-500 font-mono">{COMMON_PORT_NAMES[r.port] ?? ""}</span>
                  </div>
                  <span
                    className={["inline-flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1", style.className].join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2} />
                    {style.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
