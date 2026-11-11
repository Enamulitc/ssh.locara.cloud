import type { FastifyInstance } from "fastify";
import * as k8s from "@kubernetes/client-node";
import { requireAuth } from "../lib/auth.js";
import { canAccessKubeCluster } from "../lib/kubeAccess.js";
import { loadKubeConfig } from "../lib/kubeConnection.js";

export async function kubeBrowseRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.get("/api/kube-clusters/:clusterId/namespaces", async (request, reply) => {
    const { clusterId } = request.params as { clusterId: string };
    if (!(await canAccessKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }

    try {
      const kc = await loadKubeConfig(clusterId);
      const core = kc.makeApiClient(k8s.CoreV1Api);
      const { items } = await core.listNamespace();
      return reply.send(items.map((ns) => ns.metadata?.name).filter((name): name is string => !!name));
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : "Could not reach cluster" });
    }
  });

  app.get("/api/kube-clusters/:clusterId/namespaces/:namespace/pods", async (request, reply) => {
    const { clusterId, namespace } = request.params as { clusterId: string; namespace: string };
    if (!(await canAccessKubeCluster(request.user!.id, clusterId))) {
      return reply.code(404).send({ error: "Cluster not found" });
    }

    try {
      const kc = await loadKubeConfig(clusterId);
      const core = kc.makeApiClient(k8s.CoreV1Api);
      const { items } = await core.listNamespacedPod({ namespace });
      return reply.send(
        items.map((pod) => ({
          name: pod.metadata?.name ?? "",
          status: pod.status?.phase ?? "Unknown",
          containers: (pod.spec?.containers ?? []).map((c) => c.name),
        }))
      );
    } catch (err) {
      return reply.code(502).send({ error: err instanceof Error ? err.message : "Could not reach cluster" });
    }
  });
}
