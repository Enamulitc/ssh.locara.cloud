import type { FastifyInstance } from "fastify";
import SftpClient from "ssh2-sftp-client";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { canAccessHost, canManageHost } from "../lib/access.js";
import { loadConnectionConfig } from "../lib/connection.js";

async function withSftp<T>(hostId: string, fn: (sftp: SftpClient) => Promise<T>): Promise<T> {
  const config = await loadConnectionConfig(hostId);
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      privateKey: config.privateKey,
      passphrase: config.passphrase,
      readyTimeout: 15000,
    });
    return await fn(sftp);
  } finally {
    await sftp.end().catch(() => {});
  }
}

const pathQuerySchema = z.object({ path: z.string().default("/") });

export async function sftpRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  await app.register(import("@fastify/multipart"));

  app.get("/api/hosts/:hostId/sftp/list", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canAccessHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const { path } = pathQuerySchema.parse(request.query);

    const entries = await withSftp(hostId, (sftp) => sftp.list(path));
    return reply.send(
      entries.map((e) => ({
        name: e.name,
        type: e.type === "d" ? "directory" : e.type === "l" ? "symlink" : "file",
        size: e.size,
        modifyTime: e.modifyTime,
      }))
    );
  });

  app.get("/api/hosts/:hostId/sftp/download", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canAccessHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const { path } = pathQuerySchema.parse(request.query);

    const buffer = await withSftp(hostId, async (sftp) => {
      const data = await sftp.get(path);
      return Buffer.isBuffer(data) ? data : Buffer.from(data as string);
    });

    reply.header("Content-Disposition", `attachment; filename="${path.split("/").pop()}"`);
    reply.type("application/octet-stream");
    return reply.send(buffer);
  });

  app.post("/api/hosts/:hostId/sftp/upload", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: "No file uploaded" });

    const targetDir = (data.fields.path as { value?: string } | undefined)?.value ?? "/";
    const remotePath = `${targetDir.replace(/\/$/, "")}/${data.filename}`;
    const buffer = await data.toBuffer();

    await withSftp(hostId, (sftp) => sftp.put(buffer, remotePath));
    return reply.send({ ok: true, path: remotePath });
  });

  app.post("/api/hosts/:hostId/sftp/mkdir", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const { path } = z.object({ path: z.string() }).parse(request.body);
    await withSftp(hostId, (sftp) => sftp.mkdir(path, true));
    return reply.send({ ok: true });
  });

  app.delete("/api/hosts/:hostId/sftp/item", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const { path, isDirectory } = z
      .object({ path: z.string(), isDirectory: z.boolean().default(false) })
      .parse(request.body);
    await withSftp(hostId, (sftp) => (isDirectory ? sftp.rmdir(path, true) : sftp.delete(path)));
    return reply.send({ ok: true });
  });

  app.patch("/api/hosts/:hostId/sftp/item", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const { from, to } = z.object({ from: z.string(), to: z.string() }).parse(request.body);
    await withSftp(hostId, (sftp) => sftp.rename(from, to));
    return reply.send({ ok: true });
  });
}
