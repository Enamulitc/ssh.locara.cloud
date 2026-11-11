import { prisma } from "./prisma.js";
import { getTeamRole } from "./access.js";

/** Can this user read the given DB connection (owns it personally, or is on the owning team)? */
export async function canAccessDbConnection(userId: string, dbConnectionId: string): Promise<boolean> {
  const conn = await prisma.dbConnection.findUnique({ where: { id: dbConnectionId } });
  if (!conn) return false;
  if (conn.ownerUserId === userId) return true;
  if (conn.ownerTeamId) {
    const role = await getTeamRole(userId, conn.ownerTeamId);
    return role !== null;
  }
  return false;
}

/** Can this user modify/delete the DB connection (personal owner, or ADMIN/OWNER on the owning team)? */
export async function canManageDbConnection(userId: string, dbConnectionId: string): Promise<boolean> {
  const conn = await prisma.dbConnection.findUnique({ where: { id: dbConnectionId } });
  if (!conn) return false;
  if (conn.ownerUserId === userId) return true;
  if (conn.ownerTeamId) {
    const role = await getTeamRole(userId, conn.ownerTeamId);
    return role === "OWNER" || role === "ADMIN";
  }
  return false;
}
