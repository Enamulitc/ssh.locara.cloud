import crypto from "node:crypto";

const ALGO = "aes-256-gcm";

function masterKey(): Buffer {
  const key = process.env.VAULT_MASTER_KEY;
  if (!key) throw new Error("VAULT_MASTER_KEY is not set");
  const buf = Buffer.from(key, "base64");
  if (buf.length !== 32) {
    throw new Error("VAULT_MASTER_KEY must decode to exactly 32 bytes (base64)");
  }
  return buf;
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

export function encrypt(plaintext: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decrypt(payload: EncryptedPayload): string {
  const decipher = crypto.createDecipheriv(ALGO, masterKey(), Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

export interface PassphraseEncryptedBundle extends EncryptedPayload {
  salt: string;
}

/**
 * Used for export/import backups only — key is derived from a one-off passphrase the
 * user supplies (scrypt), independent of VAULT_MASTER_KEY, so a bundle only opens with
 * the passphrase chosen at export time regardless of which server instance reads it.
 */
export function encryptWithPassphrase(plaintext: string, passphrase: string): PassphraseEncryptedBundle {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    salt: salt.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
  };
}

export function decryptWithPassphrase(bundle: PassphraseEncryptedBundle, passphrase: string): string {
  const key = crypto.scryptSync(passphrase, Buffer.from(bundle.salt, "base64"), 32);
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(bundle.iv, "base64"));
  decipher.setAuthTag(Buffer.from(bundle.authTag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(bundle.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
