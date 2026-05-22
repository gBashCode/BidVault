import { FastifyInstance } from 'fastify';
import { prisma, withRls } from '@sealedbid/db';
import { z } from 'zod';

export default async function auditRoutes(fastify: FastifyInstance) {
  // GET /v1/tenders/:id/audit-logs
  // Auth: PROCUREMENT_MANAGER, AUDITOR, VENDOR (vendor sees only own events)
  fastify.get('/v1/tenders/:id/audit-logs', {
    preHandler: fastify.authorize(['PROCUREMENT_MANAGER', 'AUDITOR', 'VENDOR']),
    schema: {
      params: z.object({ id: z.string().cuid() }).strict(),
    },
  }, async (request, reply) => {
    const { id: tenderId } = request.params as any;

    return await withRls(request.user, async (tx) => {
      const tender = await tx.tender.findUnique({ where: { id: tenderId } });
      if (!tender) return reply.code(404).send({ message: 'Tender not found' });

      let logs = await tx.auditLog.findMany({
        where: { tenderId },
        orderBy: { createdAt: 'asc' },
      });

      // Vendor can only see their own events
      if (request.user.role === 'VENDOR') {
        logs = logs.filter((log: any) => log.actorId === request.user.id);
      }

      const response = logs.map((log: any) => ({
        id: typeof log.id === 'bigint' ? log.id.toString() : String(log.id),
        tenderId: log.tenderId,
        eventType: log.eventType,
        actorId: log.actorId,
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : log.createdAt,
        eventHash: log.eventHash,
        prevHash: log.prevHash,
        // Never return raw payload to vendor — could contain other vendor info
        payload: request.user.role === 'VENDOR' ? undefined : log.payload,
      }));

      return reply.send(response);
    });
  });
}
