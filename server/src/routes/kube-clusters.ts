import type { FastifyInstance } from "fastify";
import * as k8s from "@kubernetes/client-node";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";
import { canAccessKubeCluster, canManageKubeCluster } from "../lib/kubeAccess.js";
import { getTeamRole, getUserTeamIds } from "../lib/access.js";
import { encrypt } from "../lib/crypto.js";

const clusterSchema = z.object({
  name: z.string().min(1).max(200),
  defaultNamespace: z.string().max(200).nullable().optional(),
  tags: z.array(z.string()).default([]),
  folder: z.string().max(200).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  teamId: z.string().nullable().optional(),
});

export async function kubeClusterRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/kube-clusters", async (request, reply) => {
    const teamIds = await getUserTeamIds(request.user!.id);
    const clusters = await prisma.kubeCluster.findMany({
      where: {
        OR: [{ ownerUserId: request.user!.id }, { ownerTeamId: { in: teamIds } }],
      },
      orderBy: { name: "asc" },
    });
    return reply.send(clusters);
  });

  app.post("/api/kube-clusters", async (request, reply) => {
    const parsed = clusterSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { teamId, ...data } = parsed.data;

    if (teamId) {
      const role = await getTeamRole(request.user!.id, teamId);
      if (!role) return reply.code(403).send({ error: "Not a member of that team" });
      const cluster = await prisma.kubeCluster.create({
        data: { ...data, folder: data.folder ?? null, color: data.color ?? null, ownerTeamId: teamId },
      });
      return reply.send(cluster);
    }

    const cluster = await prisma.kubeCluster.create({
      data: { ...data, folder: data.folder ?? null, color: data.color ?? null, ownerUserId: request.user!.id },
    });
    return reply.send(cluster);
  });

  app.get("/api/kube-clusters/:clusterId", async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    if (!(await canAccessKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }
    const cluster = await prisma.kubeCluster.findUnique({ where: { id: clusterId } });
    return reply.send(cluster);
  });

  app.patch("/api/kube-clusters/:clusterId", async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    if (!(await canManageKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }
    const parsed = clusterSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { teamId, ...data } = parsed.data;

    const cluster = await prisma.kubeCluster.update({ where: { id: clusterId }, data });
    return reply.send(cluster);
  });

  app.delete("/api/kube-clusters/:clusterId", async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    if (!(await canManageKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }
    await prisma.kubeCluster.delete({ where: { id: clusterId } });
    return reply.send({ ok: true });
  });

  app.put("/api/kube-clusters/:clusterId/kubeconfig", async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    if (!(await canManageKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }
    const { kubeconfig } = z.object({ kubeconfig: z.string().min(1) }).parse(request.body);

    try {
      new k8s.KubeConfig().loadFromString(kubeconfig);
    } catch {
      return reply.code(400).send({ error: "Could not parse kubeconfig" });
    }

    const { ciphertext, iv, authTag } = encrypt(kubeconfig);
    await prisma.kubeCredential.upsert({
      where: { kubeClusterId: clusterId },
      update: { ciphertext, iv, authTag },
      create: { kubeClusterId: clusterId, ciphertext, iv, authTag },
    });
    return reply.send({ ok: true });
  });
}
