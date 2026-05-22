import { z } from 'zod';

export const PublicTenderProofSchema = z.object({
  tenderId: z.string(),
  title: z.string(),
  revealTime: z.string(),
  merkleRoot: z.string(),
  status: z.literal('REVEALED'),
  bids: z.array(
    z.object({
      vendorHash: z.string(), // keccak256(vendorId + tenderId)
      commitment: z.string(),
      merkleProof: z.array(z.string()),
      revealed: z.object({
        plaintextBid: z.record(z.any()),
        salt: z.string(),
        isValid: z.boolean(),
      }).nullable(),
    })
  ),
});

export type PublicTenderProof = z.infer<typeof PublicTenderProofSchema>;
