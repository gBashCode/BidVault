import { z } from 'zod';

export const CreateTenderBody = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  submissionDeadline: z.string().refine((d) => !Number.isNaN(Date.parse(d)), { message: 'Invalid ISO date' }),
  revealTime: z.string().refine((d) => !Number.isNaN(Date.parse(d)), { message: 'Invalid ISO date' }),
});

export const PublishTenderParams = z.object({
  id: z.string().cuid(),
});

export const TenderResponse = z.object({
  id: z.string(),
  orgId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  submissionDeadline: z.string(),
  revealTime: z.string(),
  status: z.enum(['DRAFT', 'OPEN', 'SEALED', 'REVEALED', 'CANCELLED', 'AWARDED']),
  createdAt: z.string(),
  updatedAt: z.string(),
  // bids are conditionally added in route handler
  bids: z.array(z.any()).optional(),
});
