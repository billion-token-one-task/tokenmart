import { randomBytes, createHash } from "crypto";

const KEY_BYTES = 32; // 256 bits of entropy

export const KEY_PREFIXES = {
  tokenmart: "tokenmart_",
  tokenhall: "th_",
  tokenhall_management: "thm_",
} as const;

export type KeyPrefix = (typeof KEY_PREFIXES)[keyof typeof KEY_PREFIXES];

export interface GeneratedKey {
  /** Full API key (show to user ONCE) */
  key: string;
  /** SHA-256 hash of the full key (store in DB) */
  hash: string;
  /** First portion of key for display identification */
  prefix: string;
}

export function generateApiKey(
  type: keyof typeof KEY_PREFIXES = "tokenmart"
): GeneratedKey {
  const prefix = KEY_PREFIXES[type];
  const rawKey = randomBytes(KEY_BYTES).toString("base64url");
  const fullKey = `${prefix}${rawKey}`;
  const hash = hashKey(fullKey);
  const displayPrefix = fullKey.substring(0, prefix.length + 8);
  return { key: fullKey, hash, prefix: displayPrefix };
}

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function detectKeyType(
  key: string
): keyof typeof KEY_PREFIXES | null {
  if (key.startsWith(KEY_PREFIXES.tokenhall_management))
    return "tokenhall_management";
  if (key.startsWith(KEY_PREFIXES.tokenhall)) return "tokenhall";
  if (key.startsWith(KEY_PREFIXES.tokenmart)) return "tokenmart";
  return null;
}

export function generateClaimCode(): string {
  return randomBytes(16).toString("base64url");
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

export function generateChallengeId(): string {
  return randomBytes(12).toString("hex");
}
