import { z } from 'zod';

export const SubmitBidBody = z.object({
  commitment: z.string().length(66),
  saltHash: z.string().length(66),
});

export const RevealBidBody = z.object({
  plaintextBid: z.object({}).passthrough(), // allow any shape
  salt: z.string().min(32),
});

export const BidResponse = z.object({
  id: z.string(),
  tenderId: z.string(),
  vendorId: z.string().optional(),
  commitment: z.string(),
  submittedAt: z.string().optional(),
  isValid: z.boolean().optional(),
  plaintextBid: z.object({}).passthrough().optional(),
  uploadUrl: z.string().optional(),
  uploadFields: z.record(z.string()).optional(),
});

