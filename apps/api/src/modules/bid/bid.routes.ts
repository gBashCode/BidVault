import { FastifyInstance } from "fastify";
import { prisma, withRls } from "@sealedbid/db";
import {
  SubmitBidBody,
  RevealBidBody,
  BidResponse,
  ConfirmUploadBody,
  WithdrawBidBody,
} from "./bid.schema.js";
import { verifyCommitment, createCommitment, AuditChain } from "@sealedbid/crypto";
import { z } from "zod";
import { queueWebhook } from "../webhooks/webhook.service.js";

function triggerSentryAlert(message: string, context: Record<string, any>) {
  console.error(`🚨 [SENTRY ALERT] ${message}`, context);
  const Sentry = (globalThis as any).Sentry;
  if (Sentry && typeof Sentry.captureMessage === "function") {
    Sentry.captureMessage(message, { extra: context });
  }
}

export default async function bidRoutes(fastify: FastifyInstance) {
  // Rate limit plugin for submit endpoint (10 req/min per IP)
  const rateLimit = await import("@fastify/rate-limit");
  fastify.register(rateLimit.default ?? rateLimit, {
    max: 10,
    timeWindow: "1 minute",
    allowList: [],
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Rate limit exceeded",
    }),
  });

  // POST /v1/tenders/:id/bids
  fastify.post(
    "/v1/tenders/:id/bids",
    {
      preHandler: fastify.authorize(["VENDOR"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
        body: SubmitBidBody,
        response: { 201: BidResponse },
      },
    },
    async (request, reply) => {
      const { id: tenderId } = request.params as any;
      const { commitment, saltHash } = request.body as any;

      if (commitment.length !== 66 || saltHash.length !== 66) {
        return reply.code(400).send({ message: "Invalid commitment or saltHash length" });
      }

      const bidId =
        "c" + Math.random().toString(36).slice(2, 14) + Math.random().toString(36).slice(2, 14);

      return await withRls(request.user, async (tx) => {
        const tender = await tx.tender.findUnique({ where: { id: tenderId } });
        if (!tender) return reply.code(404).send({ message: "Tender not found" });
        if (tender.status !== "OPEN")
          return reply.code(403).send({ message: "Tender not open for bids" });
        // if (new Date() > tender.submissionDeadline)
        //   return reply.code(403).send({ message: "Submission deadline passed" });

        // Prevent multiple active bids from the same vendor
        const existingBid = await tx.bid.findFirst({
          where: { tenderId, vendorId: request.user.id },
          orderBy: { submittedAt: "desc" }
        });
        if (existingBid) {
          // Check if it's withdrawn
          const withdrawal = await tx.bidWithdrawal.findUnique({ where: { bidId: existingBid.id } });
          if (!withdrawal) {
            return reply.code(409).send({ message: "Vendor already has an active bid for this tender" });
          }
        }

        // Generate presigned S3 POST URL
        const { url: uploadUrl, fields: uploadFields } = await fastify.s3.getPresignedPost(
          tenderId,
          bidId,
        );
        const encryptedBlob = `${uploadUrl}/${uploadFields.key}`;

        const bid = await tx.bid.create({
          data: {
            id: bidId,
            tenderId,
            vendorId: request.user.id,
            commitment,
            encryptedBlob,
            saltHash,
          },
        });

        // Cryptographically chained AuditLog
        const lastAudit = await tx.auditLog.findFirst({
          where: { tenderId },
          orderBy: { id: "desc" },
        });
        const chain = new AuditChain(lastAudit?.eventHash);
        const payload = {
          bidId,
          tenderId,
          vendorId: request.user.id,
          commitment,
          saltHash,
        };
        const { eventHash, prevHash } = chain.append("BID_SUBMITTED", payload);

        await tx.auditLog.create({
          data: {
            tenderId,
            prevHash,
            eventType: "BID_SUBMITTED",
            actorId: request.user.id,
            payload,
            eventHash,
          },
        });

        // Trigger webhook
        try {
          await queueWebhook("bid.submitted", tenderId);
        } catch (err) {
          console.error("Failed to queue bid.submitted webhook:", err);
        }

        return reply.code(201).send({
          id: bid.id,
          tenderId: bid.tenderId,
          vendorId: bid.vendorId,
          commitment: bid.commitment,
          submittedAt: bid.submittedAt.toISOString(),
          uploadUrl,
          uploadFields,
        });
      });
    },
  );

  // POST /v1/bids/:id/reveal
  fastify.post(
    "/v1/bids/:id/reveal",
    {
      preHandler: fastify.authorize(["VENDOR"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
        body: RevealBidBody,
        response: { 200: BidResponse },
      },
    },
    async (request, reply) => {
      const { id: bidId } = request.params as any;
      const { plaintextBid, salt } = request.body as any;

      return await withRls(request.user, async (tx) => {
        const bid = await tx.bid.findUnique({ where: { id: bidId } });
        if (!bid) return reply.code(404).send({ message: "Bid not found" });
        if (bid.vendorId !== request.user.id) return reply.code(403).send({ message: "Forbidden" });

        const tender = await tx.tender.findUnique({ where: { id: bid.tenderId } });
        if (!tender) return reply.code(404).send({ message: "Related tender not found" });

        // Check early reveal
        if (new Date() < tender.revealTime) {
          const payload = {
            bidId,
            tenderId: tender.id,
            vendorId: request.user.id,
            reason: "Reveal attempted before revealTime",
            attemptedAt: new Date().toISOString(),
          };

          const lastAudit = await tx.auditLog.findFirst({
            where: { tenderId: tender.id },
            orderBy: { id: "desc" },
          });
          const chain = new AuditChain(lastAudit?.eventHash);
          const { eventHash, prevHash } = chain.append("SECURITY_ALERT_EARLY_REVEAL", payload);

          await tx.auditLog.create({
            data: {
              tenderId: tender.id,
              prevHash,
              eventType: "SECURITY_ALERT_EARLY_REVEAL",
              actorId: request.user.id,
              payload,
              eventHash,
            },
          });

          triggerSentryAlert("Early reveal attempt detected", payload);
          return reply.code(423).send({ message: "Reveal not open yet" });
        }

        // Verify commitment
        const isCommitmentValid = verifyCommitment(plaintextBid, salt, bid.commitment);
        const computedSaltHash = createCommitment({ salt }, salt);
        const isSaltValid = computedSaltHash === bid.saltHash;

        if (!isCommitmentValid || !isSaltValid) {
          const payload = {
            bidId,
            tenderId: tender.id,
            vendorId: request.user.id,
            reason: !isCommitmentValid ? "Commitment mismatch" : "Salt mismatch",
            attemptedAt: new Date().toISOString(),
          };

          const lastAudit = await tx.auditLog.findFirst({
            where: { tenderId: tender.id },
            orderBy: { id: "desc" },
          });
          const chain = new AuditChain(lastAudit?.eventHash);
          const { eventHash, prevHash } = chain.append(
            "SECURITY_ALERT_COMMITMENT_MISMATCH",
            payload,
          );

          await tx.auditLog.create({
            data: {
              tenderId: tender.id,
              prevHash,
              eventType: "SECURITY_ALERT_COMMITMENT_MISMATCH",
              actorId: request.user.id,
              payload,
              eventHash,
            },
          });

          triggerSentryAlert("Commitment or salt mismatch alert", payload);
          return reply
            .code(400)
            .send({ message: !isCommitmentValid ? "Commitment mismatch" : "Salt mismatch" });
        }

        const updatedBid = await tx.bid.update({
          where: { id: bidId },
          data: {
            plaintextBid: plaintextBid,
            revealSalt: salt,
            isValid: true,
            revealedAt: new Date(),
          },
        });

        // Cryptographically chained AuditLog for valid reveal
        const lastAudit = await tx.auditLog.findFirst({
          where: { tenderId: tender.id },
          orderBy: { id: "desc" },
        });
        const chain = new AuditChain(lastAudit?.eventHash);
        const payload = {
          bidId,
          tenderId: tender.id,
          vendorId: request.user.id,
          isValid: true,
        };
        const { eventHash, prevHash } = chain.append("BID_REVEALED", payload);

        await tx.auditLog.create({
          data: {
            tenderId: tender.id,
            prevHash,
            eventType: "BID_REVEALED",
            actorId: request.user.id,
            payload,
            eventHash,
          },
        });

        // Trigger webhook
        try {
          await queueWebhook("bid.revealed", tender.id);
        } catch (err) {
          console.error("Failed to queue bid.revealed webhook:", err);
        }

        return reply.send({
          id: updatedBid.id,
          tenderId: updatedBid.tenderId,
          vendorId: updatedBid.vendorId,
          commitment: updatedBid.commitment,
          submittedAt: updatedBid.submittedAt.toISOString(),
          isValid: true,
          plaintextBid,
        });
      });
    },
  );

  // GET /v1/tenders/:id/bids
  fastify.get(
    "/v1/tenders/:id/bids",
    {
      preHandler: fastify.authorize(["PROCUREMENT_MANAGER", "AUDITOR", "VENDOR"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
        response: { 200: z.array(BidResponse) },
      },
    },
    async (request, reply) => {
      const { id: tenderId } = request.params as any;

      return await withRls(request.user, async (tx) => {
        const tender = await tx.tender.findUnique({ where: { id: tenderId } });
        if (!tender) return reply.code(404).send({ message: "Tender not found" });
        let whereClause: any = { tenderId };
        if (request.user.role === "VENDOR" && tender.status !== "REVEALED") {
          whereClause.vendorId = request.user.id;
        }
        const bids = await tx.bid.findMany({ where: whereClause });

        const response = bids.map((b: any) => {
          const base = {
            id: b.id,
            tenderId: b.tenderId,
            vendorId: b.vendorId,
            commitment: b.commitment,
            submittedAt: b.submittedAt?.toISOString(),
            isValid: b.isValid ?? false,
          } as any;
          if (tender.status === "REVEALED") {
            base.plaintextBid = b.plaintextBid;
          }
          return base;
        });

        return reply.send(response);
      });
    },
  );

  // POST /v1/bids/:id/confirm-upload
  // Called by frontend after S3 presigned upload completes. Records the etag + s3Key.
  fastify.post(
    "/v1/bids/:id/confirm-upload",
    {
      preHandler: fastify.authorize(["VENDOR"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
        body: ConfirmUploadBody,
      },
    },
    async (request, reply) => {
      const { id: bidId } = request.params as any;
      const { etag, s3Key } = request.body as any;

      return await withRls(request.user, async (tx) => {
        const bid = await tx.bid.findUnique({ where: { id: bidId } });
        if (!bid) return reply.code(404).send({ message: "Bid not found" });
        if (bid.vendorId !== request.user.id) return reply.code(403).send({ message: "Forbidden" });

        const tender = await tx.tender.findUnique({ where: { id: bid.tenderId } });
        if (!tender) return reply.code(404).send({ message: "Tender not found" });
        // if (new Date() > tender.submissionDeadline) {
        //   return reply.code(403).send({ message: "Submission deadline passed" });
        // }

        // Only verify access, do not arbitrarily overwrite encryptedBlob.
        // The secure S3 URL was already locked during bid creation.
        const updated = bid;

        // Audit log
        const lastAudit = await tx.auditLog.findFirst({
          where: { tenderId: bid.tenderId },
          orderBy: { id: "desc" },
        });
        const chain = new AuditChain(lastAudit?.eventHash);
        const payload = { bidId, etag, s3Key, vendorId: request.user.id };
        const { eventHash, prevHash } = chain.append("BID_UPLOAD_CONFIRMED", payload);

        await tx.auditLog.create({
          data: {
            tenderId: bid.tenderId,
            prevHash,
            eventType: "BID_UPLOAD_CONFIRMED",
            actorId: request.user.id,
            payload,
            eventHash,
          },
        });

        return reply.send({ id: updated.id, status: "upload_confirmed" });
      });
    },
  );

  // PATCH /v1/bids/:id/withdraw
  // Vendor can withdraw before submissionDeadline. Creates BidWithdrawal record.
  fastify.patch(
    "/v1/bids/:id/withdraw",
    {
      preHandler: fastify.authorize(["VENDOR"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
        body: WithdrawBidBody,
      },
    },
    async (request, reply) => {
      const { id: bidId } = request.params as any;
      const { reason } = request.body as any;

      return await withRls(request.user, async (tx) => {
        const bid = await tx.bid.findUnique({ where: { id: bidId } });
        if (!bid) return reply.code(404).send({ message: "Bid not found" });
        if (bid.vendorId !== request.user.id) return reply.code(403).send({ message: "Forbidden" });

        const tender = await tx.tender.findUnique({ where: { id: bid.tenderId } });
        if (!tender) return reply.code(404).send({ message: "Related tender not found" });

        // Can only withdraw before submissionDeadline
        if (new Date() > tender.submissionDeadline) {
          return reply.code(400).send({ message: "Withdrawal deadline has passed" });
        }

        // Check if already withdrawn
        const existing = await tx.bidWithdrawal.findUnique({ where: { bidId } });
        if (existing) {
          return reply.code(409).send({ message: "Bid already withdrawn" });
        }

        const withdrawal = await tx.bidWithdrawal.create({
          data: {
            bidId,
            reason: reason || null,
          },
        });

        // Audit log
        const lastAudit = await tx.auditLog.findFirst({
          where: { tenderId: tender.id },
          orderBy: { id: "desc" },
        });
        const chain = new AuditChain(lastAudit?.eventHash);
        const payload = {
          bidId,
          tenderId: tender.id,
          vendorId: request.user.id,
          reason: reason || null,
        };
        const { eventHash, prevHash } = chain.append("BID_WITHDRAWN", payload);

        await tx.auditLog.create({
          data: {
            tenderId: tender.id,
            prevHash,
            eventType: "BID_WITHDRAWN",
            actorId: request.user.id,
            payload,
            eventHash,
          },
        });

        // Trigger webhook
        try {
          await queueWebhook("bid.withdrawn", tender.id);
        } catch (err) {
          console.error("Failed to queue bid.withdrawn webhook:", err);
        }

        return reply.send({
          id: withdrawal.id,
          bidId: withdrawal.bidId,
          reason: withdrawal.reason,
          withdrawnAt:
            withdrawal.withdrawnAt instanceof Date
              ? withdrawal.withdrawnAt.toISOString()
              : withdrawal.withdrawnAt,
        });
      });
    },
  );
}
