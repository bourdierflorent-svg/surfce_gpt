import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { z } from "zod";

const ENCRYPTION_VERSION = "v1";
const encryptedValueSchema = z.object({
  v: z.literal(ENCRYPTION_VERSION),
  iv: z.string().min(1),
  tag: z.string().min(1),
  value: z.string().min(1),
});

function readEncryptionKey(environment: NodeJS.ProcessEnv = process.env): Buffer {
  const raw = environment.APP_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY n’est pas configurée.");
  }

  const key = /^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "APP_ENCRYPTION_KEY doit contenir exactement 32 octets encodés en base64 ou hex.",
    );
  }
  return key;
}

export function encryptSecret(value: string, environment: NodeJS.ProcessEnv = process.env): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", readEncryptionKey(environment), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return JSON.stringify({
    v: ENCRYPTION_VERSION,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    value: encrypted.toString("base64url"),
  });
}

export function decryptSecret(
  payload: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const parsed = encryptedValueSchema.parse(JSON.parse(payload));
  const decipher = createDecipheriv(
    "aes-256-gcm",
    readEncryptionKey(environment),
    Buffer.from(parsed.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.value, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function signServerValue(
  value: string,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return createHmac("sha256", readEncryptionKey(environment)).update(value).digest("base64url");
}

export function verifyServerSignature(
  value: string,
  signature: string,
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  const expected = Buffer.from(signServerValue(value, environment));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hasEncryptionKey(environment: NodeJS.ProcessEnv = process.env): boolean {
  try {
    readEncryptionKey(environment);
    return true;
  } catch {
    return false;
  }
}
