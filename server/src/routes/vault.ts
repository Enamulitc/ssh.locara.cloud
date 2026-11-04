import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { canManageHost } from "../lib/access.js";
import { encrypt } from "../lib/crypto.js";

const credentialSchema = z.object({
  type: z.enum(["PASSWORD", "PRIVATE_KEY", "PASSPHRASE"]),
  secret: z.string().min(1),
});

export async function vaultRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Never returns plaintext/ciphertext — only metadata about what's stored.
  app.get("/api/hosts/:hostId/credentials", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const credentials = await prisma.credential.findMany({
      where: { hostId },
      select: { id: true, type: true, createdAt: true, updatedAt: true },
    });
    return reply.send(credentials);
  });

  app.put("/api/hosts/:hostId/credentials", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const parsed = credentialSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const { type, secret } = parsed.data;
    const { ciphertext, iv, authTag } = encrypt(secret);

    const existing = await prisma.credential.findFirst({ where: { hostId, type } });
    const credential = existing
      ? await prisma.credential.update({
          where: { id: existing.id },
          data: { ciphertext, iv, authTag },
        })
      : await prisma.credential.create({
          data: { hostId, type, ciphertext, iv, authTag },
        });

    return reply.send({ id: credential.id, type: credential.type });
  });

  app.delete("/api/hosts/:hostId/credentials/:credentialId", async (request, reply) => {
    const { hostId, credentialId } = request.params as { hostId: string; credentialId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    await prisma.credential.deleteMany({ where: { id: credentialId, hostId } });
    return reply.send({ ok: true });
  });
}
