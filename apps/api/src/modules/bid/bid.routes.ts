import { FastifyInstance } from 'fastify';
import { prisma } from '@sealedbid/db';
import { SubmitBidBody, RevealBidBody, BidResponse } from './bid.schema';
import { verifyCommitment, createCommitment } from '@sealedbid/crypto';
import { z } from 'zod';

export default async function bidRoutes(fastify: FastifyInstance) {
  // Rate limit plugin for submit endpoint (10 req/min per IP)
  fastify.register(require('@fastify/rate-limit'), {
    max: 10,
    timeWindow: '1 minute',
    allowList: [],
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({ statusCode: 429, error: 'Too Many Requests', message: 'Rate limit exceeded' }),
  });

  // POST /v1/tenders/:id/bids
  fastify.post('/v1/tenders/:id/bids', {
    preHandler: fastify.authorize(['VENDOR']),
    schema: {
      params: z.object({ id: z.string().cuid() }).strict(),
      body: SubmitBidBody,
      response: { 201: BidResponse },
    },
  }, async (request, reply) => {
    const { id: tenderId } = request.params as any;
    const { commitment, encryptedBlob, saltHash } = request.body as any;

    // Do NOT log request.body per security rule
    const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
    if (!tender) return reply.code(404).send({ message: 'Tender not found' });
    if (tender.status !== 'OPEN') return reply.code(403).send({ message: 'Tender not open for bids' });
    if (new Date() > tender.submissionDeadline) return reply.code(403).send({ message: 'Submission deadline passed' });
    if (commitment.length !== 66 || saltHash.length !== 66) {
      return reply.code(400).send({ message: 'Invalid commitment or saltHash length' });
    }

    const bid = await prisma.bid.create({
      data: {
        tenderId,
        vendorId: request.user.id,
        commitment,
        encryptedBlob: encryptedBlob ?? null,
        saltHash,
        status: 'SUBMITTED',
      },
    });

    await prisma.auditLog.create({
      data: {
        entityId: bid.id,
        entityType: 'BID',
        action: 'SUBMITTED',
        performedBy: request.user.id,
        performedAt: new Date(),
        hashChain: '',
      },
    });

    return reply.code(201).send({ id: bid.id, commitment: bid.commitment });
  });

  // POST /v1/bids/:id/reveal
  fastify.post('/v1/bids/:id/reveal', {
    preHandler: fastify.authorize(['VENDOR']),
    schema: {
      params: z.object({ id: z.string().cuid() }).strict(),
      body: RevealBidBody,
      response: { 200: BidResponse },
    },
  }, async (request, reply) => {
    const { id: bidId } = request.params as any;
    const { plaintextBid, salt } = request.body as any;

    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) return reply.code(404).send({ message: 'Bid not found' });
    if (bid.vendorId !== request.user.id) return reply.code(403).send({ message: 'Forbidden' });

    const tender = await prisma.tender.findUnique({ where: { id: bid.tenderId } });
    if (!tender) return reply.code(404).send({ message: 'Related tender not found' });

    if (new Date() < tender.revealTime) {
      return reply.code(423).send({ message: 'Reveal not open yet' });
    }

    // Verify commitment
    const isCommitmentValid = verifyCommitment(plaintextBid, salt, bid.commitment);
    if (!isCommitmentValid) {
      return reply.code(400).send({ message: 'Commitment mismatch' });
    }
    // Verify salt hash matches
    const computedSaltHash = createCommitment({ salt }, salt);
    if (computedSaltHash !== bid.saltHash) {
      return reply.code(400).send({ message: 'Salt mismatch' });
    }

    const updatedBid = await prisma.bid.update({
      where: { id: bidId },
      data: {
        plaintextBid: JSON.stringify(plaintextBid),
        revealSalt: salt,
        isValid: true,
        revealedAt: new Date(),
        status: 'REVEALED',
      },
    });

    await prisma.auditLog.create({
      data: {
        entityId: bidId,
        entityType: 'BID',
        action: 'REVEALED',
        performedBy: request.user.id,
        performedAt: new Date(),
        hashChain: '',
      },
    });

    return reply.send({
      id: updatedBid.id,
      tenderId: updatedBid.tenderId,
      vendorId: updatedBid.vendorId,
      commitment: updatedBid.commitment,
      submittedAt: updatedBid.createdAt?.toISOString(),
      isValid: true,
      plaintextBid,
    });
  });

  // GET /v1/tenders/:id/bids
  fastify.get('/v1/tenders/:id/bids', {
    preHandler: fastify.authorize(['PROCUREMENT_MANAGER', 'AUDITOR']),
    schema: {
      params: z.object({ id: z.string().cuid() }).strict(),
      response: { 200: z.array(BidResponse) },
    },
  }, async (request, reply) => {
    const { id: tenderId } = request.params as any;
    const tender = await prisma.tender.findUnique({ where: { id: tenderId } });
    if (!tender) return reply.code(404).send({ message: 'Tender not found' });
    const bids = await prisma.bid.findMany({ where: { tenderId } });
    const response = bids.map((b) => {
      const base = {
        id: b.id,
        tenderId: b.tenderId,
        vendorId: b.vendorId,
        commitment: b.commitment,
        submittedAt: b.createdAt?.toISOString(),
        isValid: b.isValid ?? false,
      } as any;
      if (tender.status === 'REVEALED') {
        base.plaintextBid = b.plaintextBid ? JSON.parse(b.plaintextBid) : undefined;
      }
      return base;
    });
    return reply.send(response);
  });
}
