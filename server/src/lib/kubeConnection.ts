import * as k8s from "@kubernetes/client-node";
import { prisma } from "./prisma.js";
import { decrypt } from "./crypto.js";

/** Loads a cluster's kubeconfig and decrypts it just-in-time. */
export async function loadKubeConfig(clusterId: string): Promise<k8s.KubeConfig> {
  const cluster = await prisma.kubeCluster.findUnique({
    where: { id: clusterId },
    include: { credential: true },
  });
  if (!cluster) throw new Error("Kubernetes cluster not found");
  if (!cluster.credential) throw new Error("Kubernetes cluster has no kubeconfig stored");

  const kubeconfigYaml = decrypt(cluster.credential);
  const kc = new k8s.KubeConfig();
  kc.loadFromString(kubeconfigYaml);
  return kc;
}
