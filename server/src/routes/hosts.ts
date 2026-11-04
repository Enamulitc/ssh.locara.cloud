import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { canAccessHost, canManageHost, getTeamRole, getUserTeamIds } from "../lib/access.js";

const hostSchema = z.object({
  name: z.string().min(1).max(200),
  hostname: z.string().min(1).max(255),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1).max(100),
  authType: z.enum(["PASSWORD", "PRIVATE_KEY", "AGENT"]).default("PASSWORD"),
  tags: z.array(z.string()).default([]),
  folder: z.string().max(200).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  teamId: z.string().nullable().optional(),
});

function hostSummary(host: {
  id: string; name: string; hostname: string; port: number; username: string;
  authType: string; tags: string[]; folder: string | null; color: string | null;
  lastConnectedAt: Date | null; ownerUserId: string | null; ownerTeamId: string | null;
}) {
  return host;
}

export async function hostRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/hosts", async (request, reply) => {
    const teamIds = await getUserTeamIds(request.user!.id);
    const hosts = await prisma.host.findMany({
      where: {
        OR: [{ ownerUserId: request.user!.id }, { ownerTeamId: { in: teamIds } }],
      },
      orderBy: { name: "asc" },
    });
    return reply.send(hosts.map(hostSummary));
  });

  app.post("/api/hosts", async (request, reply) => {
    const parsed = hostSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { teamId, ...data } = parsed.data;

    if (teamId) {
      const role = await getTeamRole(request.user!.id, teamId);
      if (!role) return reply.code(403).send({ error: "Not a member of that team" });
      const host = await prisma.host.create({
        data: { ...data, folder: data.folder ?? null, color: data.color ?? null, ownerTeamId: teamId },
      });
      return reply.send(host);
    }

    const host = await prisma.host.create({
      data: { ...data, folder: data.folder ?? null, color: data.color ?? null, ownerUserId: request.user!.id },
    });
    return reply.send(host);
  });

  app.get("/api/hosts/:hostId", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canAccessHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const host = await prisma.host.findUnique({ where: { id: hostId } });
    return reply.send(hostSummary(host!));
  });

  app.patch("/api/hosts/:hostId", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    const parsed = hostSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { teamId, ...data } = parsed.data;

    const host = await prisma.host.update({ where: { id: hostId }, data });
    return reply.send(host);
  });

  app.delete("/api/hosts/:hostId", async (request, reply) => {
    const { hostId } = request.params as { hostId: string };
    if (!(await canManageHost(request.user!.id, hostId))) {
      return reply.code(404).send({ error: "Host not found" });
    }
    await prisma.host.delete({ where: { id: hostId } });
    return reply.send({ ok: true });
  });
}
