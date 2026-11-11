import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { canAccessDbConnection, canManageDbConnection } from "../lib/dbAccess.js";
import { getTeamRole, getUserTeamIds } from "../lib/access.js";
import { encrypt } from "../lib/crypto.js";

const dbConnectionSchema = z.object({
  name: z.string().min(1).max(200),
  engine: z.enum(["MYSQL", "POSTGRES"]),
  hostname: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535),
  database: z.string().min(1).max(200),
  username: z.string().min(1).max(100),
  tunnelHostId: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  folder: z.string().max(200).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  teamId: z.string().nullable().optional(),
});

export async function dbConnectionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/db-connections", async (request, reply) => {
    const teamIds = await getUserTeamIds(request.user!.id);
    const connections = await prisma.dbConnection.findMany({
      where: {
        OR: [{ ownerUserId: request.user!.id }, { ownerTeamId: { in: teamIds } }],
      },
      orderBy: { name: "asc" },
    });
    return reply.send(connections);
  });

  app.post("/api/db-connections", async (request, reply) => {
    const parsed = dbConnectionSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { teamId, ...data } = parsed.data;

    if (teamId) {
      const role = await getTeamRole(request.user!.id, teamId);
      if (!role) return reply.code(403).send({ error: "Not a member of that team" });
      const conn = await prisma.dbConnection.create({
        data: { ...data, folder: data.folder ?? null, color: data.color ?? null, ownerTeamId: teamId },
      });
      return reply.send(conn);
    }

    const conn = await prisma.dbConnection.create({
      data: { ...data, folder: data.folder ?? null, color: data.color ?? null, ownerUserId: request.user!.id },
    });
    return reply.send(conn);
  });

  app.get("/api/db-connections/:connectionId", async (request, reply) => {
    const { connectionId } = request.params as { connectionId: string };
    if (!(await canAccessDbConnection(request.user!.id, connectionId))) {
      return reply.code(404).send({ error: "Database connection not found" });
    }
    const conn = await prisma.dbConnection.findUnique({ where: { id: connectionId } });
    return reply.send(conn);
  });

  app.patch("/api/db-connections/:connectionId", async (request, reply) => {
    const { connectionId } = request.params as { connectionId: string };
    if (!(await canManageDbConnection(request.user!.id, connectionId))) {
      return reply.code(404).send({ error: "Database connection not found" });
    }
    const parsed = dbConnectionSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { teamId, ...data } = parsed.data;

    const conn = await prisma.dbConnection.update({ where: { id: connectionId }, data });
    return reply.send(conn);
  });

  app.delete("/api/db-connections/:connectionId", async (request, reply) => {
    const { connectionId } = request.params as { connectionId: string };
    if (!(await canManageDbConnection(request.user!.id, connectionId))) {
      return reply.code(404).send({ error: "Database connection not found" });
    }
    await prisma.dbConnection.delete({ where: { id: connectionId } });
    return reply.send({ ok: true });
  });

  app.put("/api/db-connections/:connectionId/credentials", async (request, reply) => {
    const { connectionId } = request.params as { connectionId: string };
    if (!(await canManageDbConnection(request.user!.id, connectionId))) {
      return reply.code(404).send({ error: "Database connection not found" });
    }
    const { password } = z.object({ password: z.string().min(1) }).parse(request.body);

    const { ciphertext, iv, authTag } = encrypt(password);
    await prisma.dbCredential.upsert({
      where: { dbConnectionId: connectionId },
      update: { ciphertext, iv, authTag },
      create: { dbConnectionId: connectionId, ciphertext, iv, authTag },
    });
    return reply.send({ ok: true });
  });
}
