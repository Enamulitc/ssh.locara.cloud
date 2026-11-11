import net from "node:net";

const WHOIS_PORT = 43;
const QUERY_TIMEOUT_MS = 8000;
const MAX_HOPS = 3;

function rawWhoisQuery(server: string, query: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: server, port: WHOIS_PORT });
    let data = "";

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Timed out querying ${server}`));
    }, QUERY_TIMEOUT_MS);

    socket.on("connect", () => socket.write(query + "\r\n"));
    socket.on("data", (chunk) => {
      data += chunk.toString("utf8");
    });
    socket.on("close", () => {
      clearTimeout(timer);
      resolve(data);
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/** Finds the next whois server to query from a response's referral field, if any. */
function findReferral(text: string): string | null {
  const refer = text.match(/^refer:\s*(\S+)/im);
  if (refer) return refer[1];
  const referralServer = text.match(/^ReferralServer:\s*whois:\/\/(\S+)/im);
  if (referralServer) return referralServer[1];
  const whois = text.match(/^whois:\s*(\S+)/im);
  if (whois) return whois[1];
  return null;
}

export interface WhoisResult {
  target: string;
  queriedServers: string[];
  text: string;
}

/**
 * Raw WHOIS client with referral-following, starting from IANA's root server — the same
 * two/three-hop pattern the real `whois` CLI uses (IANA -> regional registry, or
 * IANA -> TLD registry for domains) rather than guessing a single hardcoded server.
 */
export async function whoisLookup(target: string): Promise<WhoisResult> {
  const isIp = net.isIP(target) !== 0;
  const firstQuery = isIp ? target : target.split(".").pop()!.toLowerCase();

  let server = "whois.iana.org";
  let query = firstQuery;
  const queriedServers: string[] = [];
  const parts: string[] = [];

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    queriedServers.push(server);
    const text = await rawWhoisQuery(server, query);
    parts.push(hop === 0 ? text : `\n--- ${server} ---\n\n${text}`);

    const next = findReferral(text);
    if (!next || next === server) break;
    server = next;
    query = target; // after the first hop, always query the full original target
  }

  return { target, queriedServers, text: parts.join("\n") };
}
