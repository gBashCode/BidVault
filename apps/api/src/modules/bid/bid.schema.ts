import { z } from 'zod';

export const SubmitBidBody = z.object({
  commitment: z.string().length(66),
  // MUST be createCommitment({salt}, salt) — NOT keccak256(salt).
  // The backend verifies reveal by recomputing createCommitment({salt}, body.salt)
  // and comparing it to this stored saltHash. Using raw keccak will cause a 400
  // on every reveal attempt.
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

export const ConfirmUploadBody = z.object({
  etag: z.string().min(1),
  s3Key: z.string().min(1),
});

export const WithdrawBidBody = z.object({
  reason: z.string().max(500).optional(),
});

