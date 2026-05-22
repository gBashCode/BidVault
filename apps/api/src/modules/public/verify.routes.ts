import { FastifyInstance } from 'fastify';
import { verifyMerkleProof } from '@sealedbid/crypto';
import { z } from 'zod';

export default async function publicVerifyRoutes(fastify: FastifyInstance) {
  // Rate limit plugin for public verify endpoints (100 req/min per IP)
  const rateLimit = await import('@fastify/rate-limit');
  fastify.register(rateLimit.default ?? rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: [],
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({ statusCode: 429, error: 'Too Many Requests', message: 'Rate limit exceeded' }),
  });

  // POST /v1/public/verify
  fastify.post('/v1/public/verify', {
    schema: {
      body: z.object({
        merkleRoot: z.string(),
        leaf: z.string(),
        proof: z.array(z.string()),
      }).strict(),
      response: {
        200: z.object({
          valid: z.boolean(),
        }),
      },
    },
  }, async (request, reply) => {
    const { merkleRoot, leaf, proof } = request.body as any;

    try {
      const isValid = verifyMerkleProof(merkleRoot, leaf, proof);
      return reply.send({ valid: isValid });
    } catch (err) {
      // If cryptographic verification errors due to bad inputs, return valid: false
      return reply.send({ valid: false });
    }
  });
}
