import { FastifyInstance } from "fastify";
import { prisma, withRls } from "@sealedbid/db";
import { z } from "zod";

export default async function orgRoutes(fastify: FastifyInstance) {
  // GET /v1/org/:orgId/vendors
  // Auth: ORG_ADMIN, PROCUREMENT_MANAGER, AUDITOR
  // Returns vendors belonging to the org (used by the frontend invite/vendor list page)
  fastify.get(
    "/v1/org/:orgId/vendors",
    {
      preHandler: fastify.authorize(["ORG_ADMIN", "PROCUREMENT_MANAGER", "AUDITOR"]),
      schema: {
        params: z.object({ orgId: z.string() }).strict(),
      },
    },
    async (request, reply) => {
      const { orgId } = request.params as any;

      // User can only query their own org
      if (orgId !== request.user.orgId) {
        return reply.code(403).send({ message: "Forbidden" });
      }

      return await withRls(request.user, async (tx) => {
        // Get all users with role VENDOR for this org
        // The mock DB doesn't support where.role, so we filter manually
        const allUsers = (await tx.user.findMany)
          ? await (tx as any).user.findMany({ where: { orgId } })
          : [];

        const vendors = Array.isArray(allUsers)
          ? allUsers.filter((u: any) => u.role === "VENDOR")
          : [];

        const response = vendors.map((v: any) => ({
          id: v.id,
          email: v.email,
          role: v.role,
          orgId: v.orgId,
        }));

        return reply.send(response);
      });
    },
  );
}
