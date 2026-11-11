import net from "node:net";
import dns from "node:dns/promises";

export interface MxRecord {
  exchange: string;
  priority: number;
}

export interface SoaRecord {
  nsname: string;
  hostmaster: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minttl: number;
}

export interface DnsLookupResult {
  target: string;
  isIp: boolean;
  ptr?: string[];
  a?: string[];
  aaaa?: string[];
  cname?: string[];
  mx?: MxRecord[];
  txt?: string[][];
  ns?: string[];
  soa?: SoaRecord;
}

async function tryResolve<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined;
  }
}

export async function dnsLookup(target: string): Promise<DnsLookupResult> {
  if (net.isIP(target)) {
    const ptr = await tryResolve(() => dns.reverse(target));
    return { target, isIp: true, ptr };
  }

  const [a, aaaa, cname, mx, txt, ns, soa] = await Promise.all([
    tryResolve(() => dns.resolve4(target)),
    tryResolve(() => dns.resolve6(target)),
    tryResolve(() => dns.resolveCname(target)),
    tryResolve(() => dns.resolveMx(target)),
    tryResolve(() => dns.resolveTxt(target)),
    tryResolve(() => dns.resolveNs(target)),
    tryResolve(() => dns.resolveSoa(target)),
  ]);

  if (!a && !aaaa && !cname && !mx && !txt && !ns && !soa) {
    throw new Error(`Could not resolve "${target}" — no DNS records found`);
  }

  return { target, isIp: false, a, aaaa, cname, mx, txt, ns, soa };
}
