import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { decrypt, encrypt, encryptWithPassphrase, decryptWithPassphrase } from "../lib/crypto.js";

const EXPORT_FORMAT_VERSION = 1;

const exportRequestSchema = z.object({ passphrase: z.string().min(8) });

const importedCredentialSchema = z.object({
  type: z.enum(["PASSWORD", "PRIVATE_KEY", "PASSPHRASE"]),
  secret: z.string().min(1),
});

const importedHostSchema = z.object({
  name: z.string().min(1).max(200),
  hostname: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1).max(100),
  authType: z.enum(["PASSWORD", "PRIVATE_KEY", "AGENT"]),
  tags: z.array(z.string()).default([]),
  folder: z.string().max(200).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  credentials: z.array(importedCredentialSchema).default([]),
});

const exportBundleSchema = z.object({
  version: z.literal(1),
  app: z.literal("locara-ssh"),
  hosts: z.array(importedHostSchema),
});

const importRequestSchema = z.object({
  passphrase: z.string().min(1),
  file: z.object({
    salt: z.string(),
    iv: z.string(),
    authTag: z.string(),
    ciphertext: z.string(),
  }),
});

export async function transferRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Only personal hosts are exported — team hosts belong to the team, not the individual,
  // and the destination instance may not have the same team set up.
  app.post("/api/export", async (request, reply) => {
    const parsed = exportRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const hosts = await prisma.host.findMany({
      where: { ownerUserId: request.user!.id },
      include: { credentials: true },
    });

    const payload = {
      version: EXPORT_FORMAT_VERSION,
      app: "locara-ssh" as const,
      hosts: hosts.map((host) => ({
        name: host.name,
        hostname: host.hostname,
        port: host.port,
        username: host.username,
        authType: host.authType,
        tags: host.tags,
        folder: host.folder,
        color: host.color,
        credentials: host.credentials.map((cred) => ({
          type: cred.type,
          secret: decrypt(cred),
        })),
      })),
    };

    const bundle = encryptWithPassphrase(JSON.stringify(payload), parsed.data.passphrase);
    return reply.send({ version: EXPORT_FORMAT_VERSION, app: "locara-ssh", file: bundle });
  });

  app.post("/api/import", async (request, reply) => {
    const parsed = importRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    let plaintext: string;
    try {
      plaintext = decryptWithPassphrase(parsed.data.file, parsed.data.passphrase);
    } catch {
      return reply.code(400).send({ error: "Wrong passphrase or corrupted file" });
    }

    let bundle;
    try {
      bundle = exportBundleSchema.parse(JSON.parse(plaintext));
    } catch {
      return reply.code(400).send({ error: "Unrecognized or incompatible export file" });
    }

    let imported = 0;
    for (const h of bundle.hosts) {
      const host = await prisma.host.create({
        data: {
          ownerUserId: request.user!.id,
          name: h.name,
          hostname: h.hostname,
          port: h.port,
          username: h.username,
          authType: h.authType,
          tags: h.tags,
          folder: h.folder ?? null,
          color: h.color ?? null,
        },
      });
      for (const cred of h.credentials) {
        const { ciphertext, iv, authTag } = encrypt(cred.secret);
        await prisma.credential.create({
          data: { hostId: host.id, type: cred.type, ciphertext, iv, authTag },
        });
      }
      imported += 1;
    }

    return reply.send({ imported });
  });
}
