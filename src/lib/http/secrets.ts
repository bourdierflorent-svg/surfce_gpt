import { timingSafeEqual } from "node:crypto";

export function safeSecretEqual(provided: string | null | undefined, expected: string | undefined) {
  if (!provided || !expected) return false;
  const actualBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
  );
}
