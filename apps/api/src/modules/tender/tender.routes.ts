import { FastifyInstance } from "fastify";
import { prisma, withRls } from "@sealedbid/db";
import { CreateTenderBody, TenderResponse, PublishTenderParams } from "./tender.schema.js";
import { z } from "zod";
import { AuditChain } from "@sealedbid/crypto";

export default async function tenderRoutes(fastify: FastifyInstance) {
  // POST /v1/tenders
  fastify.post(
    "/v1/tenders",
    {
      preHandler: fastify.authorize(["ORG_ADMIN", "PROCUREMENT_MANAGER"]),
      schema: {
        body: CreateTenderBody,
        response: { 201: TenderResponse },
      },
    },
    async (request, reply) => {
      const { title, description, submissionDeadline, revealTime } = request.body as any;
      const subDead = new Date(submissionDeadline);
      const revTime = new Date(revealTime);
      const now = new Date();
      if (subDead < now || revTime < now) {
        return reply.code(400).send({ message: "Dates must be in the future" });
      }
      if (subDead > revTime) {
        return reply.code(400).send({ message: "submissionDeadline must be before revealTime" });
      }

      return await withRls(request.user, async (tx) => {
        const tender = await tx.tender.create({
          data: {
            orgId: request.user.orgId,
            createdById: request.user.id,
            title,
            description: description ?? null,
            submissionDeadline: subDead,
            revealTime: revTime,
            status: "DRAFT",
          },
        });
        // audit log
        const lastAudit = await tx.auditLog.findFirst({
          where: { tenderId: tender.id },
          orderBy: { id: "desc" },
        });
        const chain = new AuditChain(lastAudit?.eventHash);
        const payload = { tenderId: tender.id, title: tender.title };
        const { eventHash, prevHash } = chain.append("TENDER_CREATED", payload);

        await tx.auditLog.create({
          data: {
            tenderId: tender.id,
            prevHash,
            eventType: "TENDER_CREATED",
            actorId: request.user.id,
            payload,
            eventHash,
          },
        });
        return reply.code(201).send(tender);
      });
    },
  );

  // PATCH /v1/tenders/:id/publish
  fastify.patch(
    "/v1/tenders/:id/publish",
    {
      preHandler: fastify.authorize(["PROCUREMENT_MANAGER"]),
      schema: {
        params: PublishTenderParams,
        response: { 200: TenderResponse },
      },
    },
    async (request, reply) => {
      const { id } = request.params as any;

      return await withRls(request.user, async (tx) => {
        const tender = await tx.tender.findUnique({ where: { id } });
        if (!tender) return reply.code(404).send({ message: "Tender not found" });
        if (tender.orgId !== request.user.orgId)
          return reply.code(403).send({ message: "Forbidden" });
        if (tender.status !== "DRAFT")
          return reply.code(400).send({ message: "Only DRAFT can be published" });

        const updated = await tx.tender.update({
          where: { id },
          data: { status: "OPEN" },
        });
        const lastAudit = await tx.auditLog.findFirst({
          where: { tenderId: id },
          orderBy: { id: "desc" },
        });
        const chain = new AuditChain(lastAudit?.eventHash);
        const payload = { tenderId: id };
        const { eventHash, prevHash } = chain.append("TENDER_PUBLISHED", payload);

        await tx.auditLog.create({
          data: {
            tenderId: id,
            prevHash,
            eventType: "TENDER_PUBLISHED",
            actorId: request.user.id,
            payload,
            eventHash,
          },
        });
        return reply.send(updated);
      });
    },
  );

  // GET /v1/tenders
  fastify.get(
    "/v1/tenders",
    {
      preHandler: fastify.authorize(["ORG_ADMIN", "PROCUREMENT_MANAGER", "AUDITOR", "VENDOR"]),
    },
    async (request, reply) => {
      return await withRls(request.user, async (tx) => {
        const tenders = await tx.tender.findMany({
          orderBy: { submissionDeadline: "desc" },
        });
        return reply.send(tenders);
      });
    },
  );

  // GET /v1/tenders/:id
  fastify.get(
    "/v1/tenders/:id",
    {
      preHandler: fastify.authorize(["ORG_ADMIN", "PROCUREMENT_MANAGER", "AUDITOR", "VENDOR"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
        response: { 200: TenderResponse },
      },
    },
    async (request, reply) => {
      const { id } = request.params as any;

      return await withRls(request.user, async (tx) => {
        const tender = await tx.tender.findUnique({
          where: { id },
          include: { bids: true },
        });
        if (!tender) return reply.code(404).send({ message: "Tender not found" });
        if (tender.orgId !== request.user.orgId && request.user.role !== "VENDOR") {
          return reply.code(403).send({ message: "Forbidden" });
        }
        if (request.user.role === "VENDOR" && tender.status === "DRAFT") {
          return reply.code(403).send({ message: "Forbidden" });
        }

        const response: any = { ...tender };
        if (tender.status !== "REVEALED") {
          delete response.bids;
        }
        return reply.send(response);
      });
    },
  );

  // GET /v1/tenders/:id/documents
  fastify.get(
    "/v1/tenders/:id/documents",
    {
      preHandler: fastify.authorize(["ORG_ADMIN", "PROCUREMENT_MANAGER", "AUDITOR", "VENDOR"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
      },
    },
    async (request, reply) => {
      const { id: tenderId } = request.params as any;

      return await withRls(request.user, async (tx) => {
        const tender = await tx.tender.findUnique({ where: { id: tenderId } });
        if (!tender) return reply.code(404).send({ message: "Tender not found" });

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
    },
  );

  // DELETE /v1/tenders/:id
  fastify.delete(
    "/v1/tenders/:id",
    {
      preHandler: fastify.authorize(["ORG_ADMIN", "PROCUREMENT_MANAGER"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params as any;

      return await withRls(request.user, async (tx) => {
        const tender = await tx.tender.findUnique({ where: { id } });
        if (!tender) return reply.code(404).send({ message: "Tender not found" });
        if (tender.orgId !== request.user.orgId)
          return reply.code(403).send({ message: "Forbidden" });
        if (tender.status !== "DRAFT")
          return reply.code(400).send({ message: "Only DRAFT tenders can be deleted" });

        await tx.tender.delete({ where: { id } });

        const lastAudit = await tx.auditLog.findFirst({
          where: { tenderId: id },
          orderBy: { id: "desc" },
        });
        const chain = new AuditChain(lastAudit?.eventHash);
        const payload = { tenderId: id };
        const { eventHash, prevHash } = chain.append("TENDER_DELETED", payload);

        await tx.auditLog.create({
          data: {
            tenderId: id,
            prevHash,
            eventType: "TENDER_DELETED",
            actorId: request.user.id,
            payload,
            eventHash,
          },
        });
        return reply.code(204).send();
      });
    },
  );
}
