import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "@sealedbid/db";

export default fp(async function verifyRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/v1/public/verify/bid/:id",
    {
      schema: {
        params: {
          type: "object",
          properties: { id: { type: "string", format: "cuid" } },
          required: ["id"],
        },
        response: {
          200: {
            type: "object",
            properties: {
              commitment: { type: "string" },
              plaintextBid: { type: "object" },
              salt: { type: "string" },
              isValid: { type: "boolean" },
              proof: { type: "string" },
            },
            required: ["commitment", "plaintextBid", "salt", "isValid", "proof"],
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as any;
      const bid = await prisma.bid.findUnique({ where: { id } });
      if (!bid) return reply.code(404).send({ message: "Bid not found" });
      const response = {
        commitment: bid.commitment,
        plaintextBid: bid.plaintextBid ? JSON.parse(bid.plaintextBid) : null,
        salt: bid.revealSalt ?? null,
        isValid: bid.isValid ?? false,
        proof: "run verifyCommitment yourself",
      };
      return reply.send(response);
    },
  );
});
