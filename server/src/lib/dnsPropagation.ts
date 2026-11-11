import dns from "node:dns/promises";

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";

const QUERY_TIMEOUT_MS = 5000;

// Well-known public resolvers run by different providers, so a mismatch between them is a
// meaningful signal that a DNS change hasn't fully propagated yet. These are NOT distinct
// geographic vantage points — the query always originates from this server — just distinct
// resolver infrastructures, each with their own independent cache.
const RESOLVERS: { name: string; ip: string }[] = [
  { name: "Google", ip: "8.8.8.8" },
  { name: "Cloudflare", ip: "1.1.1.1" },
  { name: "Quad9", ip: "9.9.9.9" },
  { name: "OpenDNS", ip: "208.67.222.222" },
  { name: "Verisign", ip: "64.6.64.6" },
  { name: "Level3/Lumen", ip: "4.2.2.1" },
  { name: "DNS.WATCH", ip: "84.200.69.80" },
  { name: "Comodo Secure", ip: "8.26.56.26" },
  { name: "Yandex", ip: "77.88.8.8" },
  { name: "CleanBrowsing", ip: "185.228.168.9" },
  { name: "AdGuard", ip: "94.140.14.14" },
  { name: "UltraDNS", ip: "156.154.70.1" },
];

export interface ResolverResult {
  name: string;
  ip: string;
  values: string[] | null;
  error: string | null;
  latencyMs: number;
}

export interface PropagationSummary {
  target: string;
  recordType: DnsRecordType;
  results: ResolverResult[];
  consensus: string[] | null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function queryOne(resolver: { name: string; ip: string }, target: string, recordType: DnsRecordType): Promise<ResolverResult> {
  // tries:2 absorbs the occasional single dropped UDP packet that comes from firing many
  // concurrent lookups at once, without masking a genuinely unreachable/dead resolver.
  const r = new dns.Resolver({ timeout: QUERY_TIMEOUT_MS, tries: 2 });
  r.setServers([resolver.ip]);
  const start = Date.now();

  try {
    let values: string[];
    switch (recordType) {
      case "A":
        values = await withTimeout(r.resolve4(target), QUERY_TIMEOUT_MS);
        break;
      case "AAAA":
        values = await withTimeout(r.resolve6(target), QUERY_TIMEOUT_MS);
        break;
      case "CNAME":
        values = await withTimeout(r.resolveCname(target), QUERY_TIMEOUT_MS);
        break;
      case "NS":
        values = await withTimeout(r.resolveNs(target), QUERY_TIMEOUT_MS);
        break;
      case "TXT":
        values = (await withTimeout(r.resolveTxt(target), QUERY_TIMEOUT_MS)).map((chunks) => chunks.join(""));
        break;
      case "MX": {
        const mx = await withTimeout(r.resolveMx(target), QUERY_TIMEOUT_MS);
        values = mx
          .sort((a, b) => a.priority - b.priority)
          .map((m) => `${m.priority} ${m.exchange}`);
        break;
      }
    }
    return { name: resolver.name, ip: resolver.ip, values: values.sort(), error: null, latencyMs: Date.now() - start };
  } catch (err) {
    return { name: resolver.name, ip: resolver.ip, values: null, error: (err as Error).message, latencyMs: Date.now() - start };
  }
}

function computeConsensus(results: ResolverResult[]): string[] | null {
  const counts = new Map<string, number>();
  for (const r of results) {
    if (!r.values) continue;
    const key = r.values.join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best ? best.split(",") : null;
}

export async function checkPropagation(target: string, recordType: DnsRecordType): Promise<PropagationSummary> {
  const results = await Promise.all(RESOLVERS.map((resolver) => queryOne(resolver, target, recordType)));
  const consensus = computeConsensus(results);
  return { target, recordType, results, consensus };
}
