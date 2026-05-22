import { createCommitment } from "@sealedbid/crypto";

/**
 * Derives a cryptographic key using PBKDF2 with SHA-256 and 100,000 iterations.
 */
async function deriveKey(saltAndTenderId: string, tenderId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(saltAndTenderId),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );

  // Use the tenderId as the salt for PBKDF2 derivation
  const pbkdf2Salt = enc.encode(tenderId);

  return await globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: pbkdf2Salt,
      iterations: 600000,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false, // extractable
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypts a bid amount locally.
 * Returns the commitment and saltHash (to be sent to the API), along with the raw encrypted bytes.
 */
export async function encryptBid(
  plaintextBid: object,
  tenderId: string,
): Promise<{
  commitment: string;
  saltHash: string;
  encryptedBlob: Uint8Array;
}> {
  const enc = new TextEncoder();

  // 1. Generate 32-byte salt and convert to 64-char hex string
  const saltBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 2. Generate deterministic commitment: createCommitment(plaintextBid, salt)
  const commitment = createCommitment(plaintextBid, salt);

  // 3. saltHash MUST be createCommitment({salt}, salt) — NOT keccak256(salt).
  //    The backend reveal route recomputes this exact formula and compares it to
  //    the stored bid.saltHash. Any other formula will produce a 400 "Salt mismatch".
  const saltHash = createCommitment({ salt }, salt);

  // 4. Derive AES-GCM encryption key
  const key = await deriveKey(salt + tenderId, tenderId);

  // 5. Encrypt plaintextBid with AES-GCM using random 12-byte IV
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    enc.encode(JSON.stringify(plaintextBid)),
  );

  // 6. Pack IV (12 bytes) and ciphertext together in a single buffer
  const encryptedBlob = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  encryptedBlob.set(iv, 0);
  encryptedBlob.set(new Uint8Array(ciphertextBuffer), iv.length);

  // Save the salt ONLY to sessionStorage for reveal time (cleared on tab close)
  if (typeof sessionStorage !== "undefined") {
    // We store the salt with a key that references the commitment or can be fetched later
    sessionStorage.setItem(`salt_${commitment}`, salt);
  }

  return {
    commitment,
    saltHash,
    encryptedBlob,
  };
}

/**
 * Decrypts a bid envelope locally using the preserved salt and tenderId.
 */
export async function decryptBid(
  encryptedBlob: ArrayBuffer | Uint8Array,
  salt: string,
  tenderId: string,
): Promise<object> {
  const blobBytes =
    encryptedBlob instanceof Uint8Array ? encryptedBlob : new Uint8Array(encryptedBlob);

  if (blobBytes.length < 12) {
    throw new Error("Invalid encrypted blob length");
  }

  // Extract the 12-byte IV and the remaining ciphertext
  const iv = blobBytes.slice(0, 12);
  const ciphertext = blobBytes.slice(12);

  // Re-derive the key
  const key = await deriveKey(salt + tenderId, tenderId);

  // Decrypt
  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    ciphertext,
  );

  const dec = new TextDecoder();
  const plaintext = dec.decode(decryptedBuffer);
  return JSON.parse(plaintext);
}
