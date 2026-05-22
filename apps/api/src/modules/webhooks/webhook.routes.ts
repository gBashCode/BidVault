import { FastifyInstance } from 'fastify';
import { prisma, withRls } from '@sealedbid/db';
import * as webhookService from './webhook.service.js';
import { z } from 'zod';

export default async function webhookRoutes(fastify: FastifyInstance) {
  // POST /v1/org/:orgId/webhooks
  fastify.post('/v1/org/:orgId/webhooks', {
    preHandler: fastify.authorize(['ORG_ADMIN']),
    schema: {
      params: z.object({ orgId: z.string().cuid() }).strict(),
      body: z.object({
        url: z.string().url(),
        events: z.array(z.string()),
      }).strict(),
    },
  }, async (request, reply) => {
    const { orgId } = request.params as any;
    const { url, events } = request.body as any;

    if (orgId !== request.user.orgId) {
      return reply.code(403).send({ message: 'Forbidden' });
    }

    return await withRls(request.user, async (tx) => {
      const webhook = await webhookService.createWebhook(orgId, url, events);
      return reply.code(201).send(webhook);
    });
  });

  // GET /v1/org/:orgId/webhooks
  fastify.get('/v1/org/:orgId/webhooks', {
    preHandler: fastify.authorize(['ORG_ADMIN']),
    schema: {
      params: z.object({ orgId: z.string().cuid() }).strict(),
    },
  }, async (request, reply) => {
    const { orgId } = request.params as any;

    if (orgId !== request.user.orgId) {
      return reply.code(403).send({ message: 'Forbidden' });
    }

    return await withRls(request.user, async (tx) => {
      const list = await tx.webhook.findMany({
        where: { orgId },
      });

      // Map to exclude secrets
      const response = list.map((w: any) => ({
        id: w.id,
        orgId: w.orgId,
        url: w.url,
        events: w.events,
        isActive: w.isActive,
        createdAt: w.createdAt,
      }));

      return reply.send(response);
    });
  });

  // POST /v1/webhooks/:id/test
  fastify.post('/v1/webhooks/:id/test', {
    preHandler: fastify.authorize(['ORG_ADMIN']),
    schema: {
      params: z.object({ id: z.string().cuid() }).strict(),
    },
  }, async (request, reply) => {
    const { id } = request.params as any;

    return await withRls(request.user, async (tx) => {
      const webhook = await tx.webhook.findUnique({ where: { id } });
      if (!webhook) return reply.code(404).send({ message: 'Webhook not found' });
      if (webhook.orgId !== request.user.orgId) return reply.code(403).send({ message: 'Forbidden' });

      await webhookService.dispatchTestEvent(id);
      return reply.send({ status: 'ok', message: 'Test webhook delivered successfully' });
    });
  });

  // PATCH /v1/webhooks/:id/rotate-secret
  fastify.patch('/v1/webhooks/:id/rotate-secret', {
    preHandler: fastify.authorize(['ORG_ADMIN']),
    schema: {
      params: z.object({ id: z.string().cuid() }).strict(),
    },
  }, async (request, reply) => {
    const { id } = request.params as any;

    return await withRls(request.user, async (tx) => {
      const webhook = await tx.webhook.findUnique({ where: { id } });
      if (!webhook) return reply.code(404).send({ message: 'Webhook not found' });
      if (webhook.orgId !== request.user.orgId) return reply.code(403).send({ message: 'Forbidden' });

      const rotated = await webhookService.rotateSecret(id);
      return reply.send(rotated);
    });
  });
}
