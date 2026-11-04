import { prisma } from "./prisma.js";
import { decrypt } from "./crypto.js";

export interface SshConnectionConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

/** Loads a host's connection details and decrypts its credentials just-in-time. */
export async function loadConnectionConfig(hostId: string): Promise<SshConnectionConfig> {
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    include: { credentials: true },
  });
  if (!host) throw new Error("Host not found");

  const config: SshConnectionConfig = {
    host: host.hostname,
    port: host.port,
    username: host.username,
  };

  for (const cred of host.credentials) {
    const plaintext = decrypt(cred);
    if (cred.type === "PASSWORD") config.password = plaintext;
    if (cred.type === "PRIVATE_KEY") config.privateKey = plaintext;
    if (cred.type === "PASSPHRASE") config.passphrase = plaintext;
  }

  return config;
}
