import { describe, it, expect } from "vitest";
import { createCommitment, verifyCommitment } from "./commitment.js";

describe("commitment", () => {
  const validSalt = "a".repeat(32);

  it("returns deterministic hash for same input", () => {
    const data = { price: 100, days: 30 };
    const h1 = createCommitment(data, validSalt);
    const h2 = createCommitment(data, validSalt);
    expect(h1).toBe(h2);
    expect(h1.startsWith("0x")).toBe(true);
    expect(h1.length).toBe(66); // '0x' + 64 hex chars
  });

  it("returns same hash for different key order", () => {
    const data1 = { price: 100, days: 30 };
    const data2 = { days: 30, price: 100 };
    const h1 = createCommitment(data1, validSalt);
    const h2 = createCommitment(data2, validSalt);
    expect(h1).toBe(h2);
  });

  it("returns different hash for different salt", () => {
    const data = { price: 100, days: 30 };
    const salt2 = "b".repeat(32);
    const h1 = createCommitment(data, validSalt);
    const h2 = createCommitment(data, salt2);
    expect(h1).not.toBe(h2);
  });

  it("throws if salt is less than 32 characters", () => {
    const data = { price: 100, days: 30 };
    const invalidSalt = "a".repeat(31);
    expect(() => createCommitment(data, invalidSalt)).toThrow(
      "Salt must be at least 32 characters long",
    );
  });

  it("verifyCommitment returns true for valid commitment and false for tampered data", () => {
    const data = { price: 100, days: 30 };
    const commitment = createCommitment(data, validSalt);

    // Valid verification
    expect(verifyCommitment(data, validSalt, commitment)).toBe(true);

    // Tampered data
    const tamperedData = { price: 101, days: 30 };
    expect(verifyCommitment(tamperedData, validSalt, commitment)).toBe(false);

    // Tampered salt
    expect(verifyCommitment(data, "b".repeat(32), commitment)).toBe(false);

    // Invalid commitment string
    expect(verifyCommitment(data, validSalt, "0x" + "f".repeat(64))).toBe(false);
    expect(verifyCommitment(data, validSalt, "short")).toBe(false);
    expect(verifyCommitment(data, validSalt, null as any)).toBe(false);
  });

  it("verifyCommitment returns false if 1 char in plaintext changes", () => {
    const data1 = { text: "Hello, World!" };
    const data2 = { text: "hello, World!" }; // Case change
    const commitment = createCommitment(data1, validSalt);

    expect(verifyCommitment(data2, validSalt, commitment)).toBe(false);
  });

  it("returns specific 0x... value for predefined example", () => {
    const data = { price: 100, days: 30 };
    const commitment = createCommitment(data, "a".repeat(32));
    expect(commitment).toBe("0x5ec810742e47b1c1d1ef98d6d53033e1c7fe8714e92705a25671889af5587dd3");
  });

  it("handles arrays recursively in makeCanonical", () => {
    const data = {
      array: [
        { z: 1, a: 2 },
        { y: 3, b: 4 },
      ],
    };
    const c = createCommitment(data, validSalt);
    expect(c.startsWith("0x")).toBe(true);
  });

  it("verifyCommitment returns false if salt is invalid and throws inside createCommitment", () => {
    const data = { price: 100 };
    const commitment = "0x" + "a".repeat(64);
    // Invalid salt (< 32 chars) triggers the catch block in verifyCommitment
    expect(verifyCommitment(data, "short", commitment)).toBe(false);
  });
});
