import fp from "fastify-plugin";
import type { FastifyError, FastifyInstance, FastifyReply } from "fastify";
import { ZodError } from "zod";

export default fp(
  async function errorPlugin(fastify: FastifyInstance) {
    fastify.setErrorHandler((error: FastifyError, request, reply) => {
      // Zod validation errors
      if (error instanceof ZodError) {
        reply.code(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: error.errors.map((e) => e.message).join(", "),
        });
        return;
      }

      // Prisma unique constraint violation
      if ((error as any).code === "P2002") {
        reply.code(409).send({
          statusCode: 409,
          error: "Conflict",
          message: (error as any).meta?.target
            ? `Duplicate value for ${(error as any).meta?.target}`
            : "Unique constraint failed",
        });
        return;
      }

      // Custom safeguard error from DB triggers
      if ((error as any).message?.includes("Cannot store plaintextBid")) {
        reply.code(423).send({
          statusCode: 423,
          error: "Locked",
          message: "Plaintext bid cannot be stored before reveal time",
        });
        return;
      }

      // Fallback generic error
      const status = error.statusCode ?? 500;
      const message = error.message ?? "Internal Server Error";
      console.error("🚨 ERROR PLUGIN CAUGHT:", error);
      reply.code(status).send({ statusCode: status, error: error.name ?? "Error", message });
    });
  },
  { name: "error-plugin" },
);
