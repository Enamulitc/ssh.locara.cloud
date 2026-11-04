import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { getTeamRole } from "../lib/access.js";

const createTeamSchema = z.object({ name: z.string().min(1).max(100) });
const inviteSchema = z.object({ email: z.string().email() });

export async function teamRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/teams", async (request, reply) => {
    const teams = await prisma.team.findMany({
      where: { members: { some: { userId: request.user!.id } } },
      include: { members: { include: { user: { select: { id: true, email: true, name: true } } } } },
    });
    return reply.send(teams);
  });

  app.post("/api/teams", async (request, reply) => {
    const parsed = createTeamSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const team = await prisma.team.create({
      data: {
        name: parsed.data.name,
        ownerId: request.user!.id,
        members: { create: { userId: request.user!.id, role: "OWNER" } },
      },
      include: { members: true },
    });
    return reply.send(team);
  });

  app.post("/api/teams/:teamId/members", async (request, reply) => {
    const { teamId } = request.params as { teamId: string };
    const role = await getTeamRole(request.user!.id, teamId);
    if (role !== "OWNER" && role !== "ADMIN") {
      return reply.code(403).send({ error: "Not allowed" });
    }

    const parsed = inviteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      return reply.code(404).send({ error: "No account found with that email yet" });
    }

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
    });
    if (existing) return reply.code(409).send({ error: "Already a member" });

    const member = await prisma.teamMember.create({
      data: { teamId, userId: user.id, role: "MEMBER" },
    });
    return reply.send(member);
  });

  app.delete("/api/teams/:teamId/members/:userId", async (request, reply) => {
    const { teamId, userId } = request.params as { teamId: string; userId: string };
    const role = await getTeamRole(request.user!.id, teamId);
    if (role !== "OWNER" && role !== "ADMIN") {
      return reply.code(403).send({ error: "Not allowed" });
    }
    await prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
    return reply.send({ ok: true });
  });
}
