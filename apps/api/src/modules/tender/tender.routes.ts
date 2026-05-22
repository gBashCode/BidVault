import { FastifyInstance } from 'fastify';
import { prisma, withRls } from '@sealedbid/db';
import { CreateTenderBody, TenderResponse, PublishTenderParams } from './tender.schema.js';
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

    return await withRls(request.user, async (tx) => {
      const tender = await tx.tender.create({
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
      await tx.auditLog.create({
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

    return await withRls(request.user, async (tx) => {
      const tender = await tx.tender.findUnique({ where: { id } });
      if (!tender) return reply.code(404).send({ message: 'Tender not found' });
      if (tender.orgId !== request.user.orgId) return reply.code(403).send({ message: 'Forbidden' });
      if (tender.status !== 'DRAFT') return reply.code(400).send({ message: 'Only DRAFT can be published' });
      
      const updated = await tx.tender.update({
        where: { id },
        data: { status: 'OPEN' },
      });
      await tx.auditLog.create({
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
  });

  // GET /v1/tenders
  fastify.get('/v1/tenders', {
    preHandler: fastify.authorize(['ORG_ADMIN', 'PROCUREMENT_MANAGER', 'AUDITOR', 'VENDOR']),
  }, async (request, reply) => {
    return await withRls(request.user, async (tx) => {
      const tenders = await tx.tender.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return reply.send(tenders);
    });
  });

  // GET /v1/tenders/:id
  fastify.get('/v1/tenders/:id', {
    preHandler: fastify.authorize(['ORG_ADMIN', 'PROCUREMENT_MANAGER', 'AUDITOR', 'VENDOR']),
    schema: { params: z.object({ id: z.string().cuid() }).strict(), response: { 200: TenderResponse } },
  }, async (request, reply) => {
    const { id } = request.params as any;

    return await withRls(request.user, async (tx) => {
      const tender = await tx.tender.findUnique({
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
  });

  // GET /v1/tenders/:id/documents
  fastify.get('/v1/tenders/:id/documents', {
    preHandler: fastify.authorize(['ORG_ADMIN', 'PROCUREMENT_MANAGER', 'AUDITOR', 'VENDOR']),
    schema: {
      params: z.object({ id: z.string().cuid() }).strict(),
    },
  }, async (request, reply) => {
    const { id: tenderId } = request.params as any;

    return await withRls(request.user, async (tx) => {
      const tender = await tx.tender.findUnique({ where: { id: tenderId } });
      if (!tender) return reply.code(404).send({ message: 'Tender not found' });

      const documents = await tx.tenderDocument.findMany({
        where: { tenderId },
      });

      const response = documents.map((doc: any) => ({
        id: doc.id,
        tenderId: doc.tenderId,
        filename: doc.filename,
        fileSize: doc.fileSize,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
      }));

      return reply.send(response);
    });
  });
}
