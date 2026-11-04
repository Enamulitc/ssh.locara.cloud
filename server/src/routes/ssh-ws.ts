import type { FastifyInstance } from "fastify";
import { Client as SshClient } from "ssh2";
import { requireAuth } from "../lib/auth.js";
import { canAccessHost } from "../lib/access.js";
import { loadConnectionConfig, type SshConnectionConfig } from "../lib/connection.js";
import { prisma } from "../lib/prisma.js";

type ClientMessage =
  | { type: "data"; data: string }
  | { type: "resize"; cols: number; rows: number };

type ServerMessage =
  | { type: "data"; data: string }
  | { type: "error"; message: string }
  | { type: "exit" };

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
        });
      });

      ssh.on("error", (err) => {
        send({ type: "error", message: `Connection error: ${err.message}` });
      });

      socket.on("close", () => {
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
