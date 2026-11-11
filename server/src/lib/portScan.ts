import net from "node:net";
import dns from "node:dns/promises";

export type PortState = "open" | "closed" | "filtered";

export interface PortScanResult {
  port: number;
  state: PortState;
}

const SCAN_TIMEOUT_MS = 1500;
const CONCURRENCY = 50;
const MAX_PORTS = 1024;

// Roughly nmap's "top ports" set — common web, mail, DB, and remote-access services.
export const DEFAULT_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 465, 514, 587, 993, 995, 1433, 1521,
  2049, 2375, 3000, 3306, 3389, 5000, 5432, 5900, 5984, 6379, 6443, 7000, 8000, 8008, 8080, 8081,
  8443, 8888, 9000, 9090, 9200, 9300, 11211, 27017, 27018, 50000,
];

export class PortScanError extends Error {}

/** Parses "22,80,443,8000-8100" into a sorted, de-duplicated port list, capped at MAX_PORTS. */
export function parsePortSpec(spec: string): number[] {
  const ports = new Set<number>();
  for (const part of spec.split(",").map((p) => p.trim()).filter(Boolean)) {
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end > 65535 || start > end) {
        throw new PortScanError(`Invalid port range: ${part}`);
      }
      for (let p = start; p <= end; p++) ports.add(p);
    } else {
      const port = Number(part);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new PortScanError(`Invalid port: ${part}`);
      }
      ports.add(port);
    }
    if (ports.size > MAX_PORTS) {
      throw new PortScanError(`Too many ports requested (max ${MAX_PORTS})`);
    }
  }
  return Array.from(ports).sort((a, b) => a - b);
}

function probePort(ip: string, port: number): Promise<PortScanResult> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    function finish(state: PortState) {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ port, state });
    }

    socket.setTimeout(SCAN_TIMEOUT_MS);
    socket.once("connect", () => finish("open"));
    socket.once("timeout", () => finish("filtered"));
    socket.once("error", (err: NodeJS.ErrnoException) => {
      finish(err.code === "ECONNREFUSED" ? "closed" : "filtered");
    });
    socket.connect({ host: ip, port });
  });
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface PortScanSummary {
  target: string;
  resolvedIp: string;
  results: PortScanResult[];
}

export async function scanTarget(target: string, ports: number[]): Promise<PortScanSummary> {
  let resolvedIp: string;
  try {
    const { address } = await dns.lookup(target);
    resolvedIp = address;
  } catch {
    throw new PortScanError(`Could not resolve "${target}"`);
  }

  const results = await runWithConcurrency(ports, CONCURRENCY, (port) => probePort(resolvedIp, port));
  return { target, resolvedIp, results };
}
