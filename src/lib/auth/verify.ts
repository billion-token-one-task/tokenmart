import { timingSafeEqual, createHash, randomBytes, scryptSync } from "crypto";

/**
 * Timing-safe comparison of a provided key against a stored hash.
 * Prevents timing attacks by ensuring comparison takes constant time.
 */
export function verifyKeyAgainstHash(
  providedKey: string,
  storedHash: string
): boolean {
  const providedHash = createHash("sha256").update(providedKey).digest("hex");
  if (providedHash.length !== storedHash.length) return false;
  return timingSafeEqual(
    Buffer.from(providedHash, "hex"),
    Buffer.from(storedHash, "hex")
  );
}

/**
 * Extract bearer token from Authorization header.
 */
export function extractBearerToken(
  authHeader: string | null
): string | null {
  if (!authHeader) return null;
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== "Bearer") return null;
  return parts[1];
}

/**
 * Legacy password hashing scheme (v1): SHA-256(password + salt).
 * Kept for backwards compatibility with existing rows.
 */
export function hashPassword(password: string, salt: string): string {
  return createHash("sha256")
    .update(password + salt)
    .digest("hex");
}

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

const PASSWORD_SCHEME_V2 = "scrypt_v2";
const SCRYPT_KEY_LENGTH = 64;

function hashPasswordV2(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString("hex");
}

export function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = hashPasswordV2(password, salt);
  return `${PASSWORD_SCHEME_V2}$${salt}$${hash}`;
}

function verifyHash(expectedHex: string, actualHex: string): boolean {
  if (expectedHex.length !== actualHex.length) return false;
  return timingSafeEqual(
    Buffer.from(expectedHex, "hex"),
    Buffer.from(actualHex, "hex")
  );
}

export function verifyPasswordHash(
  password: string,
  storedHash: string
): { valid: boolean; needsRehash: boolean } {
  // v2 format: scrypt_v2$salt$hash
  if (storedHash.startsWith(`${PASSWORD_SCHEME_V2}$`)) {
    const [, salt, expectedHash] = storedHash.split("$");
    if (!salt || !expectedHash) {
      return { valid: false, needsRehash: false };
    }
    const actualHash = hashPasswordV2(password, salt);
    return { valid: verifyHash(expectedHash, actualHash), needsRehash: false };
  }

  // v1 format: salt:sha256(password+salt)
  const [salt, expectedHash] = storedHash.split(":");
  if (!salt || !expectedHash) {
    return { valid: false, needsRehash: false };
  }

  const actualHash = hashPassword(password, salt);
  const valid = verifyHash(expectedHash, actualHash);
  return { valid, needsRehash: valid };
}
