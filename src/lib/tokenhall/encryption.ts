import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "crypto";

const LEGACY_ALGORITHM = "aes-256-cbc";
const ALGORITHM_V2 = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended nonce length for GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive a deterministic 256-bit key from the ENCRYPTION_SECRET env var.
 * Uses scrypt with a fixed salt derived from the secret itself so the
 * result is stable across calls but still benefits from key-stretching.
 */
function deriveKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "ENCRYPTION_SECRET environment variable is not set. " +
        "It is required for provider key encryption.",
    );
  }
  // Use a portion of the secret as salt for scrypt.  This is acceptable
  // because the secret itself is high-entropy.
  const salt = secret.slice(0, 16).padEnd(16, "0");
  return scryptSync(secret, salt, KEY_LENGTH);
}

/**
 * Encrypt a plaintext provider API key.
 *
 * @returns An object containing the hex-encoded ciphertext and IV.
 */
export function encryptProviderKey(plainKey: string): {
  encrypted: string;
  iv: string;
} {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM_V2, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainKey, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: `gcm:${encrypted.toString("hex")}:${authTag.toString("hex")}`,
    iv: iv.toString("hex"),
  };
}

/**
 * Decrypt a previously-encrypted provider API key.
 *
 * @param encrypted  Hex-encoded ciphertext produced by `encryptProviderKey`.
 * @param iv         Hex-encoded initialisation vector.
 * @returns The original plaintext key.
 */
export function decryptProviderKey(encrypted: string, iv: string): string {
  const key = deriveKey();
  const ivBuffer = Buffer.from(iv, "hex");

  // v2 envelope: gcm:<ciphertext_hex>:<auth_tag_hex>
  if (encrypted.startsWith("gcm:")) {
    const [, ciphertextHex, authTagHex] = encrypted.split(":");
    if (!ciphertextHex || !authTagHex) {
      throw new Error("Malformed encrypted provider key payload");
    }
    const decipher = createDecipheriv(ALGORITHM_V2, key, ivBuffer);
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }

  // Legacy fallback for older rows encrypted with AES-CBC.
  const legacyDecipher = createDecipheriv(LEGACY_ALGORITHM, key, ivBuffer);
  const legacyDecrypted = Buffer.concat([
    legacyDecipher.update(Buffer.from(encrypted, "hex")),
    legacyDecipher.final(),
  ]);
  return legacyDecrypted.toString("utf8");
}
