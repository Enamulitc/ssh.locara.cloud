import type { FastifyInstance } from "fastify";
import { Readable, Writable } from "node:stream";
import * as k8s from "@kubernetes/client-node";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { canAccessKubeCluster, canManageKubeCluster } from "../lib/kubeAccess.js";
import { loadKubeConfig } from "../lib/kubeConnection.js";

const fileQuerySchema = z.object({
  namespace: z.string().min(1),
  pod: z.string().min(1),
  container: z.string().min(1),
  path: z.string().min(1),
});

function bufferWritable(sink: Buffer[]) {
  return new Writable({
    write(chunk, _encoding, callback) {
      sink.push(chunk);
      callback();
    },
  });
}

function readableFrom(text: string) {
  const r = new Readable({ read() {} });
  r.push(Buffer.from(text, "utf8"));
  r.push(null);
  return r;
}

/** Runs a one-shot command in a pod via the exec protocol and collects its output. */
async function execCapture(
  kc: k8s.KubeConfig,
  namespace: string,
  pod: string,
  container: string,
  command: string[],
  stdin?: Readable
): Promise<string> {
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  const stdout = bufferWritable(stdoutChunks);
  const stderr = bufferWritable(stderrChunks);

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(Buffer.concat(stdoutChunks).toString("utf8"));
    };

    new k8s.Exec(kc)
      .exec(namespace, pod, container, command, stdout, stderr, stdin ?? null, false, (status) => {
        if (status.status === "Failure") {
          const stderrText = Buffer.concat(stderrChunks).toString("utf8").trim();
          finish(new Error(stderrText || status.message || "Command failed"));
        } else {
          finish();
        }
      })
      .then((ws) => {
        ws.on("close", () => finish());
        ws.on("error", (err: Error) => finish(err));
      })
      .catch((err) => finish(err instanceof Error ? err : new Error(String(err))));
  });
}

const dirQuerySchema = z.object({
  namespace: z.string().min(1),
  pod: z.string().min(1),
  container: z.string().min(1),
  path: z.string().min(1),
});

export async function kubeFileRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/kube-clusters/:clusterId/dir", async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    if (!(await canAccessKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }
    const parsed = dirQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { namespace, pod, container, path } = parsed.data;

    try {
      const kc = await loadKubeConfig(clusterId);
      const output = await execCapture(kc, namespace, pod, container, ["ls", "-1Ap", path]);
      const entries = output
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const isDir = line.endsWith("/");
          return {
            name: isDir ? line.slice(0, -1) : line,
            type: isDir ? ("directory" as const) : ("file" as const),
          };
        });
      return reply.send(entries);
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : "Could not list directory" });
    }
  });

  app.get("/api/kube-clusters/:clusterId/file", async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    if (!(await canAccessKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }
    const parsed = fileQuerySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { namespace, pod, container, path } = parsed.data;

    try {
      const kc = await loadKubeConfig(clusterId);
      const content = await execCapture(kc, namespace, pod, container, ["cat", path]);
      return reply.type("text/plain").send(content);
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : "Could not read file" });
    }
  });

  app.put("/api/kube-clusters/:clusterId/file", async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    if (!(await canManageKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }
    const parsedQuery = fileQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) return reply.code(400).send({ error: parsedQuery.error.flatten() });
    const { namespace, pod, container, path } = parsedQuery.data;

    const parsedBody = z.object({ content: z.string() }).safeParse(request.body);
    if (!parsedBody.success) return reply.code(400).send({ error: parsedBody.error.flatten() });

    try {
      const kc = await loadKubeConfig(clusterId);
      // Pass path as $0 (not interpolated into the script string) so it can't break out of the quotes.
      await execCapture(kc, namespace, pod, container, ["sh", "-c", 'cat > "$0"', path], readableFrom(parsedBody.data.content));
      return reply.send({ ok: true });
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : "Could not write file" });
    }
  });
}
