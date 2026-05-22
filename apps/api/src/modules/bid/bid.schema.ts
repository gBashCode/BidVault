import { z } from 'zod';

export const SubmitBidBody = z.object({
  commitment: z.string().length(66), // assuming hex string with 0x prefix? adjust as needed
  encryptedBlob: z.string().url().optional(), // placeholder for now
  saltHash: z.string().length(66),
});

export const RevealBidBody = z.object({
  plaintextBid: z.object({}).passthrough(), // allow any shape
  salt: z.string().min(32),
});

export const BidResponse = z.object({
  id: z.string(),
  tenderId: z.string(),
  vendorId: z.string(),
  commitment: z.string(),
  submittedAt: z.string(),
  isValid: z.boolean().optional(),
  // plaintextBid only when revealed and requester authorized
  plaintextBid: z.object({}).passthrough().optional(),
});
