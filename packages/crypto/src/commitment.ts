import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

/**
 * Recursively sorts all keys of an object to ensure deterministic JSON serialization.
 */
export function makeCanonical(val: any): any {
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(makeCanonical);
  }
  const keys = Object.keys(val).sort();
  const sorted: Record<string, any> = {};
  for (const key of keys) {
    sorted[key] = makeCanonical(val[key]);
  }
  return sorted;
}

/**
 * Creates a cryptographic commitment for a JSON-serializable object and a salt.
 * @param data Any JSON-serializable object
 * @param salt A random salt string of at least 32 characters
 * @returns 0x-prefixed hex string of 64 characters (after the 0x)
 */
export function createCommitment(data: object, salt: string): string {
  if (typeof salt !== 'string' || salt.length < 32) {
    throw new Error('Salt must be at least 32 characters long');
  }

  const canonical = makeCanonical(data);
  const canonicalString = JSON.stringify(canonical);
  const dataToHash = canonicalString + salt;

  const hashBytes = keccak_256(utf8ToBytes(dataToHash));
  return '0x' + bytesToHex(hashBytes);
}

/**
 * Constant-time comparison of two strings.
 */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies a commitment against given data and salt in constant-time.
 * @param data The JSON-serializable object to verify
 * @param salt The salt string to verify
 * @param commitment The 0x-prefixed commitment string to compare against
 * @returns True if the commitment is valid, false otherwise
 */
export function verifyCommitment(data: object, salt: string, commitment: string): boolean {
  if (typeof commitment !== 'string') {
    return false;
  }

  let expected: string;
  try {
    expected = createCommitment(data, salt);
  } catch {
    return false;
  }

  return safeCompare(expected, commitment);
}
