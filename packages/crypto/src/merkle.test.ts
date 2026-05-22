import { describe, it, expect } from "vitest";
import { buildTenderMerkleTree, getMerkleProof, verifyMerkleProof } from "./merkle.js";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

function makeCommitment(index: number): string {
  const hashBytes = keccak_256(utf8ToBytes(`mock_commitment_${index}`));
  return "0x" + bytesToHex(hashBytes);
}

describe("Merkle Tree Cryptographic Sealing", () => {
  it("buildTenderMerkleTree handles 1, 2, 3, and 100 leaves deterministically", () => {
    const counts = [1, 2, 3, 100];
    for (const count of counts) {
      const leaves = Array.from({ length: count }, (_, i) => makeCommitment(i));

      const { root: r1 } = buildTenderMerkleTree(leaves);
      const { root: r2 } = buildTenderMerkleTree(leaves);

      expect(r1).toBe(r2);
      expect(r1.startsWith("0x")).toBe(true);
      expect(r1.length).toBe(66);
    }
  });

  it("getMerkleProof verifies true for each leaf", () => {
    const leafCount = 10;
    const leaves = Array.from({ length: leafCount }, (_, i) => makeCommitment(i));
    const sorted = [...leaves].sort();
    const { root } = buildTenderMerkleTree(leaves);

    for (const leaf of sorted) {
      const proof = getMerkleProof(leaves, leaf);
      const verified = verifyMerkleProof(root, leaf, proof);
      expect(verified).toBe(true);
    }
  });

  it("getMerkleProof throws an error if leaf is not found", () => {
    const leaves = [makeCommitment(1), makeCommitment(2)];
    const missingLeaf = makeCommitment(3);

    expect(() => getMerkleProof(leaves, missingLeaf)).toThrow();
  });

  it("verifyMerkleProof returns false if leaf has changed", () => {
    const leaves = [makeCommitment(1), makeCommitment(2), makeCommitment(3)];
    const sorted = [...leaves].sort();
    const { root } = buildTenderMerkleTree(leaves);

    const leafToVerify = sorted[0];
    const proof = getMerkleProof(leaves, leafToVerify);

    const tamperedLeaf = makeCommitment(4);
    const verified = verifyMerkleProof(root, tamperedLeaf, proof);
    expect(verified).toBe(false);
  });

  it("verifyMerkleProof returns false if root has changed", () => {
    const leaves = [makeCommitment(1), makeCommitment(2), makeCommitment(3)];
    const sorted = [...leaves].sort();
    const { root } = buildTenderMerkleTree(leaves);

    const leafToVerify = sorted[0];
    const proof = getMerkleProof(leaves, leafToVerify);

    const tamperedRoot = "0x" + "f".repeat(64);
    const verified = verifyMerkleProof(tamperedRoot, leafToVerify, proof);
    expect(verified).toBe(false);
  });
});
