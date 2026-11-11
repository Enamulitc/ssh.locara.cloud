import net from "node:net";
import { Client as SshClient } from "ssh2";
import { prisma } from "./prisma.js";
import { decrypt } from "./crypto.js";
import { loadConnectionConfig } from "./connection.js";

export interface DbConnectionConfig {
  engine: "MYSQL" | "POSTGRES";
  host: string;
  port: number;
  database: string;
  username: string;
  password?: string;
  tunnelHostId?: string | null;
}

/** Loads a DB connection's details and decrypts its credential just-in-time. */
export async function loadDbConnectionConfig(dbConnectionId: string): Promise<DbConnectionConfig> {
  const conn = await prisma.dbConnection.findUnique({
    where: { id: dbConnectionId },
    include: { credential: true },
  });
  if (!conn) throw new Error("Database connection not found");

  return {
    engine: conn.engine,
    host: conn.hostname,
    port: conn.port,
    database: conn.database,
    username: conn.username,
    password: conn.credential ? decrypt(conn.credential) : undefined,
    tunnelHostId: conn.tunnelHostId,
  };
}

export interface Tunnel {
  /** The local port, bound on 127.0.0.1 only, that proxies through to the destination. */
  port: number;
  close: () => void;
}

/**
 * Opens an SSH connection to `tunnelHostId` (reusing that host's stored SSH credentials),
 * then starts a local TCP server (127.0.0.1-only, ephemeral port) that forwards each
 * connection through that SSH session to `destHost:destPort` — equivalent to `ssh -L`.
 * Database drivers connect to the returned local port exactly like a normal TCP database,
 * so this works uniformly for any driver without needing driver-specific stream support.
 */
export function openTunnel(tunnelHostId: string, destHost: string, destPort: number): Promise<Tunnel> {
  return new Promise((resolve, reject) => {
    loadConnectionConfig(tunnelHostId)
      .then((config) => {
        const ssh = new SshClient();

        ssh.on("ready", () => {
          const server = net.createServer((socket) => {
            socket.on("error", () => socket.destroy());
            ssh.forwardOut("127.0.0.1", socket.remotePort ?? 0, destHost, destPort, (err, stream) => {
              if (err) {
                socket.destroy();
                return;
              }
              stream.on("error", () => socket.destroy());
              socket.pipe(stream).pipe(socket);
              socket.on("close", () => stream.end());
              stream.on("close", () => socket.destroy());
            });
          });

          server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 0;
            resolve({
              port,
              close: () => {
                server.close();
                ssh.end();
              },
            });
          });

          server.on("error", (err) => {
            ssh.end();
            reject(err);
          });
        });

        ssh.on("error", (err) => reject(err));
        ssh.connect({
          host: config.host,
          port: config.port,
          username: config.username,
          password: config.password,
          privateKey: config.privateKey,
          passphrase: config.passphrase,
          readyTimeout: 15000,
        });
      })
      .catch(reject);
  });
}
