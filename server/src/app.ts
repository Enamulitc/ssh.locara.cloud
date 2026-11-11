import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import { authRoutes } from "./routes/auth.js";
import { teamRoutes } from "./routes/teams.js";
import { hostRoutes } from "./routes/hosts.js";
import { vaultRoutes } from "./routes/vault.js";
import { sshWsRoutes } from "./routes/ssh-ws.js";
import { sftpRoutes } from "./routes/sftp.js";
import { transferRoutes } from "./routes/transfer.js";
import { kubeClusterRoutes } from "./routes/kube-clusters.js";
import { kubeBrowseRoutes } from "./routes/kube-browse.js";
import { kubeWsRoutes } from "./routes/kube-ws.js";
import { kubeFileRoutes } from "./routes/kube-files.js";
import { dbConnectionRoutes } from "./routes/db-connections.js";
import { dbWsRoutes } from "./routes/db-ws.js";
import { portScanRoutes } from "./routes/port-scan.js";
import { dnsLookupRoutes } from "./routes/dns-lookup.js";
import { dnsPropagationRoutes } from "./routes/dns-propagation.js";
import { whoisRoutes } from "./routes/whois.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.WEB_ORIGIN ?? "http://localhost:5173",
  credentials: true,
});
await app.register(cookie);
await app.register(websocket);

app.get("/health", async () => ({ ok: true }));

await app.register(authRoutes);
await app.register(teamRoutes);
await app.register(hostRoutes);
await app.register(vaultRoutes);
await app.register(sshWsRoutes);
await app.register(sftpRoutes);
await app.register(transferRoutes);
await app.register(kubeClusterRoutes);
await app.register(kubeBrowseRoutes);
await app.register(kubeWsRoutes);
await app.register(kubeFileRoutes);
await app.register(dbConnectionRoutes);
await app.register(dbWsRoutes);
await app.register(portScanRoutes);
await app.register(dnsLookupRoutes);
await app.register(dnsPropagationRoutes);
await app.register(whoisRoutes);

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
