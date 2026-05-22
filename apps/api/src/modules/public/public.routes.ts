import { FastifyInstance } from 'fastify';
import { prisma } from '@sealedbid/db';
import { buildTenderMerkleTree } from '@sealedbid/crypto';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import { z } from 'zod';
import { PublicTenderProofSchema } from './public.schema.js';

export default async function publicRoutes(fastify: FastifyInstance) {
  // Rate limit plugin for public endpoints (100 req/min per IP)
  fastify.register(require('@fastify/rate-limit'), {
    max: 100,
    timeWindow: '1 minute',
    allowList: [],
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({ statusCode: 429, error: 'Too Many Requests', message: 'Rate limit exceeded' }),
  });

  // GET /v1/public/tenders/:id/proof
  fastify.get('/v1/public/tenders/:id/proof', {
    schema: {
      params: z.object({ id: z.string().cuid() }).strict(),
      response: { 200: PublicTenderProofSchema },
    },
  }, async (request, reply) => {
    const { id: tenderId } = request.params as any;

    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
    });

    if (!tender) {
      return reply.code(404).send({ message: 'Tender not found' });
    }

    if (tender.status !== 'REVEALED') {
      return reply.code(404).send({ message: 'Tender not revealed yet' });
    }

    const bids = await prisma.bid.findMany({
      where: { tenderId },
    });

    const commitments = bids.map((b) => b.commitment);
    const { tree } = buildTenderMerkleTree(commitments);

    const publicBids = bids.map((bid) => {
      const vendorHashBytes = keccak_256(utf8ToBytes(bid.vendorId + tender.id));
      const vendorHash = '0x' + bytesToHex(vendorHashBytes);

      const merkleProof = tree.getHexProof(Buffer.from(bid.commitment.replace(/^0x/, ''), 'hex'));

      const revealed = bid.isValid && bid.plaintextBid
        ? {
            plaintextBid: typeof bid.plaintextBid === 'string' ? JSON.parse(bid.plaintextBid) : bid.plaintextBid,
            salt: bid.revealSalt || '',
            isValid: true,
          }
        : null;

      return {
        vendorHash,
        commitment: bid.commitment,
        merkleProof,
        revealed,
      };
    });

    const response = {
      tenderId: tender.id,
      title: tender.title,
      revealTime: tender.revealTime.toISOString(),
      merkleRoot: tender.merkleRoot || '',
      status: 'REVEALED' as const,
      bids: publicBids,
    };

    // Cache: 60s, this data is immutable after reveal
    reply.header('Cache-Control', 'public, max-age=60');

    return reply.send(response);
  });
}
