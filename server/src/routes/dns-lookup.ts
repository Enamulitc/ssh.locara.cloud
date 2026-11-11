import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { dnsLookup } from "../lib/dnsLookup.js";

const lookupSchema = z.object({ target: z.string().min(1).max(255) });

export async function dnsLookupRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/api/dns-lookup", async (request, reply) => {
    const parsed = lookupSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    try {
      const result = await dnsLookup(parsed.data.target.trim());
      return reply.send(result);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
