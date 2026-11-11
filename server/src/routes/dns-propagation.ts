import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { checkPropagation } from "../lib/dnsPropagation.js";

const propagationSchema = z.object({
  target: z.string().min(1).max(255),
  recordType: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]),
});

export async function dnsPropagationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/api/dns-propagation", async (request, reply) => {
    const parsed = propagationSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const summary = await checkPropagation(parsed.data.target.trim(), parsed.data.recordType);
    return reply.send(summary);
  });
}
