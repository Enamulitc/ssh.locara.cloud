import { prisma } from "./prisma.js";
import { getTeamRole } from "./access.js";

/** Can this user read the given cluster (owns it personally, or is on the owning team)? */
export async function canAccessKubeCluster(userId: string, clusterId: string): Promise<boolean> {
  const cluster = await prisma.kubeCluster.findUnique({ where: { id: clusterId } });
  if (!cluster) return false;
  if (cluster.ownerUserId === userId) return true;
  if (cluster.ownerTeamId) {
    const role = await getTeamRole(userId, cluster.ownerTeamId);
    return role !== null;
  }
  return false;
}

/** Can this user modify/delete the cluster (personal owner, or ADMIN/OWNER on the owning team)? */
export async function canManageKubeCluster(userId: string, clusterId: string): Promise<boolean> {
  const cluster = await prisma.kubeCluster.findUnique({ where: { id: clusterId } });
  if (!cluster) return false;
  if (cluster.ownerUserId === userId) return true;
  if (cluster.ownerTeamId) {
    const role = await getTeamRole(userId, cluster.ownerTeamId);
    return role === "OWNER" || role === "ADMIN";
  }
  return false;
}
