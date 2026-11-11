import { FormEvent, ReactNode, useState } from "react";
import { Globe } from "lucide-react";
import { useDnsLookup } from "../lib/hooks";
import { ApiError } from "../lib/api";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-slate-800 first:border-t-0 pt-3 first:pt-0 mt-3 first:mt-0">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function RecordList({ values }: { values: string[] }) {
  return (
    <div className="space-y-1">
      {values.map((v, i) => (
        <div key={i} className="font-mono text-sm text-white">
          {v}
        </div>
      ))}
    </div>
  );
}

export function DnsLookup() {
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lookup = useDnsLookup();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await lookup.mutateAsync(target.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lookup failed");
    }
  }

  const result = lookup.data;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Globe className="h-5 w-5 text-brand-400" strokeWidth={2} />
          DNS lookup
        </h1>
        <p className="text-sm text-slate-500">Resolve a domain's DNS records, or reverse-lookup an IP.</p>
      </div>

      <form onSubmit={onSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        {error && <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm text-slate-400">Domain or IP</label>
          <input
            required
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="example.com or 8.8.8.8"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={lookup.isPending}
          className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow shadow-brand-900/30"
        >
          <Globe className={["h-4 w-4", lookup.isPending ? "animate-pulse" : ""].join(" ")} strokeWidth={2.25} />
          {lookup.isPending ? "Looking up…" : "Lookup"}
        </button>
      </form>

      {result && (
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          {result.isIp ? (
            <Section title="PTR (reverse DNS)">
              {result.ptr?.length ? <RecordList values={result.ptr} /> : <p className="text-sm text-slate-500">No PTR record.</p>}
            </Section>
          ) : (
            <>
              <Section title="A">
                {result.a?.length ? <RecordList values={result.a} /> : <p className="text-sm text-slate-500">None</p>}
              </Section>
              <Section title="AAAA">
                {result.aaaa?.length ? <RecordList values={result.aaaa} /> : <p className="text-sm text-slate-500">None</p>}
              </Section>
              {result.cname && result.cname.length > 0 && (
                <Section title="CNAME">
                  <RecordList values={result.cname} />
                </Section>
              )}
              <Section title="MX">
                {result.mx?.length ? (
                  <div className="space-y-1">
                    {result.mx.map((mx, i) => (
                      <div key={i} className="font-mono text-sm text-white">
                        {mx.priority} {mx.exchange && mx.exchange !== "." ? mx.exchange : "(null — no mail accepted)"}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">None</p>
                )}
              </Section>
              <Section title="TXT">
                {result.txt?.length ? (
                  <div className="space-y-1">
                    {result.txt.map((chunks, i) => (
                      <div key={i} className="font-mono text-xs text-white break-all">
                        {chunks.join("")}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">None</p>
                )}
              </Section>
              <Section title="NS">
                {result.ns?.length ? <RecordList values={result.ns} /> : <p className="text-sm text-slate-500">None</p>}
              </Section>
              {result.soa && (
                <Section title="SOA">
                  <div className="font-mono text-xs text-slate-300 space-y-0.5">
                    <div>Primary NS: {result.soa.nsname}</div>
                    <div>Hostmaster: {result.soa.hostmaster}</div>
                    <div>Serial: {result.soa.serial}</div>
                    <div>
                      Refresh/Retry/Expire/TTL: {result.soa.refresh}s / {result.soa.retry}s / {result.soa.expire}s / {result.soa.minttl}s
                    </div>
                  </div>
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
