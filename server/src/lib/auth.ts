import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "./prisma.js";

const SESSION_COOKIE = "locara_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function jwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createSession(reply: FastifyReply, userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const session = await prisma.session.create({
    data: { userId, tokenHash: "", expiresAt },
  });

  const token = jwt.sign({ sid: session.id, uid: userId }, jwtSecret(), {
    expiresIn: "30d",
  });

  await prisma.session.update({
    where: { id: session.id },
    data: { tokenHash: hashToken(token) },
  });

  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret()) as { sid: string };
      await prisma.session.deleteMany({ where: { id: payload.sid } });
    } catch {
      // ignore invalid token on logout
    }
  }
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export interface AuthedUser {
  id: string;
  email: string;
  name: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthedUser;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) {
    return reply.code(401).send({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret()) as { sid: string; uid: string };
    const session = await prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.tokenHash !== hashToken(token) || session.expiresAt < new Date()) {
      return reply.code(401).send({ error: "Session expired" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user) {
      return reply.code(401).send({ error: "User not found" });
    }

    request.user = { id: user.id, email: user.email, name: user.name };
  } catch {
    return reply.code(401).send({ error: "Invalid session" });
  }
}

export async function getUserFromCookieToken(token: string | undefined): Promise<AuthedUser | null> {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret()) as { sid: string; uid: string };
    const session = await prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.tokenHash !== hashToken(token) || session.expiresAt < new Date()) {
      return null;
    }
    const user = await prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user) return null;
    return { id: user.id, email: user.email, name: user.name };
  } catch {
    return null;
  }
}

export { SESSION_COOKIE };
