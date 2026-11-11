import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../lib/auth.js";
import { DEFAULT_PORTS, PortScanError, parsePortSpec, scanTarget } from "../lib/portScan.js";

const scanSchema = z.object({
  target: z.string().min(1).max(255),
  ports: z.string().max(2000).optional(),
});

export async function portScanRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  app.post("/api/port-scan", async (request, reply) => {
    const parsed = scanSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { target, ports } = parsed.data;

    let portList: number[];
    try {
      portList = ports ? parsePortSpec(ports) : DEFAULT_PORTS;
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }

    try {
      const summary = await scanTarget(target.trim(), portList);
      return reply.send(summary);
    } catch (err) {
      const message = err instanceof PortScanError ? err.message : "Scan failed";
      return reply.code(400).send({ error: message });
    }
  });
}
