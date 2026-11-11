import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { whoisLookup } from "../lib/whois.js";

const whoisSchema = z.object({ target: z.string().min(1).max(255) });

export async function whoisRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/api/whois", async (request, reply) => {
    const parsed = whoisSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    try {
      const result = await whoisLookup(parsed.data.target.trim());
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
