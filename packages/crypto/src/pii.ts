import { crypto } from "@noble/hashes/crypto";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes, hexToBytes } from "@noble/hashes/utils";

// In production, this would be injected via environment variable (e.g., process.env.PII_SECRET).
// For the development/mock environment, we use a static fallback.
const PII_SECRET = process.env.PII_SECRET || "8f7b3c2d1e4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c";
const ENCRYPTION_ALGORITHM = "AES-GCM";

/**
 * Deterministic hash for lookups (e.g. searching for a user by email)
 */
export function hashPII(plaintext: string): string {
  const hashBytes = keccak_256(utf8ToBytes(plaintext.toLowerCase().trim() + PII_SECRET));
  return "0x" + bytesToHex(hashBytes);
}

/**
 * Encrypts PII securely with AES-256-GCM.
 */
export async function encryptPII(plaintext: string): Promise<string> {
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    hexToBytes(PII_SECRET).slice(0, 32),
    { name: ENCRYPTION_ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encodedPlaintext = new TextEncoder().encode(plaintext);

  const ciphertext = await globalThis.crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    keyMaterial,
    encodedPlaintext
  );

  // Pack the IV and Ciphertext together for storage
  const packed = new Uint8Array(iv.length + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(ciphertext), iv.length);

  return Buffer.from(packed).toString("base64");
}

/**
 * Decrypts PII using the global server PII secret.
 */
export async function decryptPII(ciphertextBase64: string): Promise<string> {
  const packed = new Uint8Array(Buffer.from(ciphertextBase64, "base64"));
  const iv = packed.slice(0, 12);
  const ciphertext = packed.slice(12);

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    "raw",
    hexToBytes(PII_SECRET).slice(0, 32),
    { name: ENCRYPTION_ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );

  const decrypted = await globalThis.crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGORITHM, iv },
    keyMaterial,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}
