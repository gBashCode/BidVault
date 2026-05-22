import { FastifyInstance } from 'fastify';
import { prisma } from '@sealedbid/db';
import { CreateTenderBody, TenderResponse, PublishTenderParams } from './tender.schema';
import { z } from 'zod';

export default async function tenderRoutes(fastify: FastifyInstance) {
  // POST /v1/tenders
  fastify.post('/v1/tenders', {
    preHandler: fastify.authorize(['ORG_ADMIN', 'PROCUREMENT_MANAGER']),
    schema: {
      body: CreateTenderBody,
      response: { 201: TenderResponse },
    },
  }, async (request, reply) => {
    const { title, description, submissionDeadline, revealTime } = request.body as any;
    const subDead = new Date(submissionDeadline);
    const revTime = new Date(revealTime);
    if (subDead > revTime) {
      return reply.code(400).send({ message: 'submissionDeadline must be before revealTime' });
    }
    const tender = await prisma.tender.create({
      data: {
        orgId: request.user.orgId,
        title,
        description: description ?? null,
        submissionDeadline: subDead,
        revealTime: revTime,
        status: 'DRAFT',
      },
    });
    // audit log
    await prisma.auditLog.create({
      data: {
        entityId: tender.id,
        entityType: 'TENDER',
        action: 'CREATED',
        performedBy: request.user.id,
        performedAt: new Date(),
        hashChain: '' // placeholder, actual chaining handled in DB trigger
      },
    });
    return reply.code(201).send(tender);
  });

  // PATCH /v1/tenders/:id/publish
  fastify.patch('/v1/tenders/:id/publish', {
    preHandler: fastify.authorize(['PROCUREMENT_MANAGER']),
    schema: {
      params: PublishTenderParams,
      response: { 200: TenderResponse },
    },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const tender = await prisma.tender.findUnique({ where: { id } });
    if (!tender) return reply.code(404).send({ message: 'Tender not found' });
    if (tender.orgId !== request.user.orgId) return reply.code(403).send({ message: 'Forbidden' });
    if (tender.status !== 'DRAFT') return reply.code(400).send({ message: 'Only DRAFT can be published' });
    const updated = await prisma.tender.update({
      where: { id },
      data: { status: 'OPEN' },
    });
    await prisma.auditLog.create({
      data: {
        entityId: id,
        entityType: 'TENDER',
        action: 'PUBLISHED',
        performedBy: request.user.id,
        performedAt: new Date(),
        hashChain: ''
      },
    });
    return reply.send(updated);
  });

  // GET /v1/tenders/:id
  fastify.get('/v1/tenders/:id', {
    preHandler: fastify.authorize(['ORG_ADMIN', 'PROCUREMENT_MANAGER', 'AUDITOR', 'VENDOR']),
    schema: { params: z.object({ id: z.string().cuid() }).strict(), response: { 200: TenderResponse } },
  }, async (request, reply) => {
    const { id } = request.params as any;
    const tender = await prisma.tender.findUnique({
      where: { id },
      include: { bids: true },
    });
    if (!tender) return reply.code(404).send({ message: 'Tender not found' });
    if (tender.orgId !== request.user.orgId && request.user.role !== 'VENDOR') {
      return reply.code(403).send({ message: 'Forbidden' });
    }
    const response: any = { ...tender };
    if (tender.status !== 'REVEALED' && request.user.role !== 'PROCUREMENT_MANAGER' && request.user.role !== 'AUDITOR') {
      delete response.bids;
    }
    return reply.send(response);
  });
}
