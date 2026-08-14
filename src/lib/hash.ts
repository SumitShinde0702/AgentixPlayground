import { createHash, randomBytes } from "node:crypto";

export function sha256(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

export function nonce(bytes = 16) {
  return randomBytes(bytes).toString("hex");
}

export function canonical(value: unknown) {
  return JSON.stringify(value);
}
