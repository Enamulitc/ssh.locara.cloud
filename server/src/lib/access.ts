import { prisma } from "./prisma.js";
import type { TeamRole } from "@prisma/client";

export async function getUserTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });
  return memberships.map((m) => m.teamId);
}

export async function getTeamRole(userId: string, teamId: string): Promise<TeamRole | null> {
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  return membership?.role ?? null;
}

/** Can this user read the given host (owns it personally, or is on the owning team)? */
export async function canAccessHost(userId: string, hostId: string): Promise<boolean> {
  const host = await prisma.host.findUnique({ where: { id: hostId } });
  if (!host) return false;
  if (host.ownerUserId === userId) return true;
  if (host.ownerTeamId) {
    const role = await getTeamRole(userId, host.ownerTeamId);
    return role !== null;
  }
  return false;
}

/** Can this user modify/delete the host (personal owner, or ADMIN/OWNER on the owning team)? */
export async function canManageHost(userId: string, hostId: string): Promise<boolean> {
  const host = await prisma.host.findUnique({ where: { id: hostId } });
  if (!host) return false;
  if (host.ownerUserId === userId) return true;
  if (host.ownerTeamId) {
    const role = await getTeamRole(userId, host.ownerTeamId);
    return role === "OWNER" || role === "ADMIN";
  }
  return false;
}
