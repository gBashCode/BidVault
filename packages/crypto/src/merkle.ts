import { MerkleTree } from 'merkletreejs';
import { keccak_256 } from '@noble/hashes/sha3';

/**
 * Builds a standard Merkle tree using EVM-compatible Keccak-256.
 * Expects lexicographically sorted commitment hex strings.
 */
export function buildTenderMerkleTree(commitments: string[]): { root: string; tree: MerkleTree } {
  const sorted = [...commitments].sort();
  const leaves = sorted.map((c) => {
    const clean = c.startsWith('0x') ? c.slice(2) : c;
    return Buffer.from(clean, 'hex');
  });

  const hasher = (data: Buffer): Buffer => {
    return Buffer.from(keccak_256(data));
  };

  const tree = new MerkleTree(leaves, hasher, { sortPairs: true });
  const root = '0x' + tree.getHexRoot().replace(/^0x/, '');

  return { root, tree };
}

/**
 * Returns Merkle proof hex array for the given leaf commitment.
 */
export function getMerkleProof(commitments: string[], leafCommitment: string): string[] {
  const sorted = [...commitments].sort();
  const idx = sorted.indexOf(leafCommitment);
  if (idx === -1) {
    throw new Error('Leaf commitment not found');
  }

  const { tree } = buildTenderMerkleTree(commitments);
  const cleanLeaf = leafCommitment.startsWith('0x') ? leafCommitment.slice(2) : leafCommitment;
  const leafBuffer = Buffer.from(cleanLeaf, 'hex');

  return tree.getHexProof(leafBuffer);
}

/**
 * Standard Merkle proof verification.
 */
export function verifyMerkleProof(root: string, leaf: string, proof: string[]): boolean {
  const cleanLeaf = leaf.startsWith('0x') ? leaf.slice(2) : leaf;
  const leafBuffer = Buffer.from(cleanLeaf, 'hex');

  const cleanRoot = root.startsWith('0x') ? root.slice(2) : root;
  const rootBuffer = Buffer.from(cleanRoot, 'hex');

  const hasher = (data: Buffer): Buffer => {
    return Buffer.from(keccak_256(data));
  };

  return MerkleTree.verify(proof, leafBuffer, rootBuffer, hasher, { sortPairs: true });
}
