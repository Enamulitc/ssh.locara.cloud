import type { FastifyInstance } from "fastify";
import { Client as SshClient } from "ssh2";
import { requireAuth } from "../lib/auth.js";
import { canAccessHost } from "../lib/access.js";
import { loadConnectionConfig, type SshConnectionConfig } from "../lib/connection.js";
import { prisma } from "../lib/prisma.js";

type ClientMessage =
  | { type: "data"; data: string }
  | { type: "resize"; cols: number; rows: number };

export interface HostStats {
  memTotal: number;
  memUsed: number;
  memFree: number;
  cpuPercent: number;
  cpuCores: number;
  diskTotal: number;
  diskUsed: number;
  diskFree: number;
  netRxBytesPerSec: number;
  netTxBytesPerSec: number;
  os: string;
  user: string;
}

type ServerMessage =
  | { type: "data"; data: string }
  | { type: "error"; message: string }
  | { type: "exit" }
  | { type: "stats"; stats: HostStats };

// Ships as a single `exec` command (no extra quoting layer needed — the SSH server just
// hands this whole string to the remote user's shell). Reads from /proc and df only, so it
// works on any Linux box without relying on `free`/procps being installed.
const STATS_SCRIPT = `
awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END{print "MEM", t, a}' /proc/meminfo
awk '/^cpu /{print "CPU", $2+$3+$4+$5+$6+$7+$8+$9, $5+$6}' /proc/stat
echo "NPROC $(nproc 2>/dev/null || grep -c ^processor /proc/cpuinfo)"
awk -F: 'NR>2{n=$1; gsub(/^[ \\t]+/,"",n); if(n!="lo"){split($2,a," "); rx+=a[1]; tx+=a[9]}} END{print "NET", rx+0, tx+0}' /proc/net/dev
df -k / | awk 'NR==2{print "DISK", $2*1024, $3*1024, $4*1024}'
OS=$( (grep PRETTY_NAME /etc/os-release 2>/dev/null | cut -d= -f2 | tr -d '"') || uname -s)
echo "OS $OS"
echo "USER $(whoami)"
`;

interface RawSample {
  memTotal: number;
  memAvail: number;
  cpuTotal: number;
  cpuIdle: number;
  cpuCores: number;
  netRx: number;
  netTx: number;
  diskTotal: number;
  diskUsed: number;
  diskFree: number;
  os: string;
  user: string;
  at: number;
}

function parseStatsOutput(output: string): RawSample {
  const sample: RawSample = {
    memTotal: 0,
    memAvail: 0,
    cpuTotal: 0,
    cpuIdle: 0,
    cpuCores: 1,
    netRx: 0,
    netTx: 0,
    diskTotal: 0,
    diskUsed: 0,
    diskFree: 0,
    os: "",
    user: "",
    at: Date.now(),
  };
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    const parts = trimmed.split(/\s+/);
    switch (parts[0]) {
      case "MEM":
        sample.memTotal = Number(parts[1]) * 1024;
        sample.memAvail = Number(parts[2]) * 1024;
        break;
      case "CPU":
        sample.cpuTotal = Number(parts[1]);
        sample.cpuIdle = Number(parts[2]);
        break;
      case "NPROC":
        sample.cpuCores = Number(parts[1]) || 1;
        break;
      case "NET":
        sample.netRx = Number(parts[1]);
        sample.netTx = Number(parts[2]);
        break;
      case "DISK":
        sample.diskTotal = Number(parts[1]);
        sample.diskUsed = Number(parts[2]);
        sample.diskFree = Number(parts[3]);
        break;
      case "OS":
        sample.os = trimmed.replace(/^OS\s*/, "").trim();
        break;
      case "USER":
        sample.user = parts[1] ?? "";
        break;
    }
  }
  return sample;
}

function sampleToStats(sample: RawSample, prev: RawSample | null): HostStats {
  let cpuPercent = 0;
  let netRxBytesPerSec = 0;
  let netTxBytesPerSec = 0;

  if (prev) {
    const dTotal = sample.cpuTotal - prev.cpuTotal;
    const dIdle = sample.cpuIdle - prev.cpuIdle;
    if (dTotal > 0) {
      cpuPercent = Math.max(0, Math.min(100, ((dTotal - dIdle) / dTotal) * 100));
    }
    const dSeconds = (sample.at - prev.at) / 1000;
    if (dSeconds > 0) {
      netRxBytesPerSec = Math.max(0, (sample.netRx - prev.netRx) / dSeconds);
      netTxBytesPerSec = Math.max(0, (sample.netTx - prev.netTx) / dSeconds);
    }
  }

  return {
    memTotal: sample.memTotal,
    memUsed: sample.memTotal - sample.memAvail,
    memFree: sample.memAvail,
    cpuPercent,
    cpuCores: sample.cpuCores,
    diskTotal: sample.diskTotal,
    diskUsed: sample.diskUsed,
    diskFree: sample.diskFree,
    netRxBytesPerSec,
    netTxBytesPerSec,
    os: sample.os,
    user: sample.user,
  };
}

export async function sshWsRoutes(app: FastifyInstance) {
  app.get(
    "/ws/ssh/:hostId",
    { websocket: true, preHandler: requireAuth },
    async (socket, request) => {
      const { hostId } = request.params as { hostId: string };
      const send = (msg: ServerMessage) => socket.send(JSON.stringify(msg));

      if (!(await canAccessHost(request.user!.id, hostId))) {
        send({ type: "error", message: "Host not found or access denied" });
        socket.close();
        return;
      }

      let config: SshConnectionConfig;
      try {
        config = await loadConnectionConfig(hostId);
      } catch (err) {
        send({ type: "error", message: "Could not load host credentials" });
        socket.close();
        return;
      }

      const ssh = new SshClient();
      let statsTimer: NodeJS.Timeout | undefined;

      ssh.on("ready", () => {
        prisma.host.update({ where: { id: hostId }, data: { lastConnectedAt: new Date() } }).catch(() => {});

        ssh.shell({ term: "xterm-256color" }, (err, stream) => {
          if (err) {
            send({ type: "error", message: `Shell error: ${err.message}` });
            ssh.end();
            return;
          }

          stream.on("data", (chunk: Buffer) => {
            send({ type: "data", data: chunk.toString("utf8") });
          });
          stream.on("close", () => {
            send({ type: "exit" });
            clearInterval(statsTimer);
            ssh.end();
            socket.close();
          });

          socket.on("message", (raw: Buffer) => {
            let msg: ClientMessage;
            try {
              msg = JSON.parse(raw.toString());
            } catch {
              return;
            }
            if (msg.type === "data") {
              stream.write(msg.data);
            } else if (msg.type === "resize") {
              stream.setWindow(msg.rows, msg.cols, 0, 0);
            }
          });

          // Stats run as a separate `exec` channel multiplexed over this same SSH
          // connection — independent of the interactive shell stream above.
          let prevSample: RawSample | null = null;
          let statsInFlight = false;
          statsTimer = setInterval(() => {
            if (statsInFlight) return;
            statsInFlight = true;
            ssh.exec(STATS_SCRIPT, (execErr, statsStream) => {
              if (execErr) {
                statsInFlight = false;
                return;
              }
              let output = "";
              statsStream.on("data", (chunk: Buffer) => {
                output += chunk.toString("utf8");
              });
              statsStream.stderr.on("data", () => {});
              statsStream.on("close", () => {
                statsInFlight = false;
                try {
                  const sample = parseStatsOutput(output);
                  const stats = sampleToStats(sample, prevSample);
                  prevSample = sample;
                  send({ type: "stats", stats });
                } catch {
                  // malformed output (non-Linux host, missing tools) — skip this sample
                }
              });
            });
          }, 3000);
        });
      });

      ssh.on("error", (err) => {
        send({ type: "error", message: `Connection error: ${err.message}` });
      });

      socket.on("close", () => {
        clearInterval(statsTimer);
        ssh.end();
      });

      ssh.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
        readyTimeout: 15000,
      });
    }
  );
}
