import type { FastifyInstance } from "fastify";
import { Writable, Readable } from "node:stream";
import * as k8s from "@kubernetes/client-node";
import { requireAuth } from "../lib/auth.js";
import { canAccessKubeCluster } from "../lib/kubeAccess.js";
import { loadKubeConfig } from "../lib/kubeConnection.js";
import { prisma } from "../lib/prisma.js";

type ClientMessage =
  | { type: "data"; data: string }
  | { type: "resize"; cols: number; rows: number };

type ServerMessage =
  | { type: "data"; data: string }
  | { type: "error"; message: string }
  | { type: "exit" };

/** A Writable that forwards chunks to the websocket and exposes the rows/columns + "resize"
 * event contract that @kubernetes/client-node's Exec looks for to wire up TTY resizing. */
class TtyOutputStream extends Writable {
  rows = 24;
  columns = 80;

  constructor(private readonly send: (msg: ServerMessage) => void) {
    super();
  }

  _write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void) {
    this.send({ type: "data", data: chunk.toString("utf8") });
    callback();
  }

  resize(cols: number, rows: number) {
    this.columns = cols;
    this.rows = rows;
    this.emit("resize");
  }
}

export async function kubeWsRoutes(app: FastifyInstance) {
  app.get(
    "/ws/kube/:clusterId/exec",
    { websocket: true, preHandler: requireAuth },
    async (socket, request) => {
      const { clusterId } = request.params as { clusterId: string };
      const { namespace, pod, container } = request.query as {
        namespace?: string;
        pod?: string;
        container?: string;
      };
      const send = (msg: ServerMessage) => socket.send(JSON.stringify(msg));

      if (!namespace || !pod || !container) {
        send({ type: "error", message: "Missing namespace, pod, or container" });
        socket.close();
        return;
      }

      if (!(await canAccessKubeCluster(request.user!.id, clusterId))) {
        send({ type: "error", message: "Cluster not found or access denied" });
        socket.close();
        return;
      }

      let kc: k8s.KubeConfig;
      try {
        kc = await loadKubeConfig(clusterId);
      } catch (err) {
        send({ type: "error", message: "Could not load cluster kubeconfig" });
        socket.close();
        return;
      }

      const stdout = new TtyOutputStream(send);
      const stdin = new Readable({ read() {} });

      socket.on("message", (raw: Buffer) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg.type === "data") {
          stdin.push(Buffer.from(msg.data, "utf8"));
        } else if (msg.type === "resize") {
          stdout.resize(msg.cols, msg.rows);
        }
      });

      socket.on("close", () => {
        stdin.push(null);
      });

      try {
        prisma.kubeCluster.update({ where: { id: clusterId }, data: { lastConnectedAt: new Date() } }).catch(() => {});

        const exec = new k8s.Exec(kc);
        const ws = await exec.exec(
          namespace,
          pod,
          container,
          ["/bin/sh"],
          stdout,
          stdout,
          stdin,
          true,
          (status) => {
            send({ type: "exit" });
            socket.close();
            if (status.status === "Failure" && status.message) {
              send({ type: "error", message: status.message });
            }
          }
        );
        ws.on("close", () => {
          send({ type: "exit" });
          socket.close();
        });
        ws.on("error", (err: Error) => {
          send({ type: "error", message: `Connection error: ${err.message}` });
        });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Could not start exec session" });
        socket.close();
      }
    }
  );
}
