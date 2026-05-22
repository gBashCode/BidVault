import { FastifyInstance } from "fastify";
import { prisma, withRls } from "@sealedbid/db";
import { z } from "zod";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { AuditReport } from "@sealedbid/pdf";
import { createHash } from "crypto";
import {
  getComplianceMetrics,
  tenderVolumeByMonth,
  vendorParticipation,
  avgBidsPerTender,
  collusionSuspects,
} from "../analytics/analytics.service.js";

// Cache for GET /v1/org/:orgId/metrics
// Maps cache key (orgId:from:to) to cached data and expiry timestamp
const metricsCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function makePdfBufferDeterministic(buffer: Buffer, fixedDateStr = "20260522000000Z"): Buffer {
  let pdfString = buffer.toString("binary");

  // Replace CreationDate (D:20260522133237Z)
  pdfString = pdfString.replace(/\/CreationDate\s*\([^)]+\)/g, `/CreationDate (D:${fixedDateStr})`);

  // Replace ModDate (D:20260522133237Z)
  pdfString = pdfString.replace(/\/ModDate\s*\([^)]+\)/g, `/ModDate (D:${fixedDateStr})`);

  // Replace Producer/Creator or any dynamic ID if present
  pdfString = pdfString.replace(
    /\/ID\s*\[\s*<[0-9a-fA-F]+>\s*<[0-9a-fA-F]+>\s*\]/g,
    `/ID [<00000000000000000000000000000000> <00000000000000000000000000000000>]`,
  );

  return Buffer.from(pdfString, "binary");
}

export default async function complianceRoutes(fastify: FastifyInstance) {
  // GET /v1/org/:orgId/metrics
  fastify.get(
    "/v1/org/:orgId/metrics",
    {
      preHandler: fastify.authorize(["ORG_ADMIN", "AUDITOR", "PROCUREMENT_MANAGER"]),
      schema: {
        params: z.object({ orgId: z.string().cuid() }).strict(),
        query: z
          .object({
            from: z.string().datetime().optional(),
            to: z.string().datetime().optional(),
          })
          .strict(),
      },
    },
    async (request, reply) => {
      const { orgId } = request.params as any;
      const { from, to } = request.query as any;

      if (orgId !== request.user.orgId) {
        return reply.code(403).send({ message: "Forbidden" });
      }

      const cacheKey = `${orgId}:${from || ""}:${to || ""}`;
      const cached = metricsCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return reply.send(cached.data);
      }

      const result = await getComplianceMetrics(request.user, from, to);
      const monthlyVolume = await tenderVolumeByMonth(orgId);
      const vendorPart = await vendorParticipation(orgId);
      const avgBids = await avgBidsPerTender(orgId);
      const collusion = await collusionSuspects(orgId);

      const response = {
        ...result,
        monthlyVolume,
        vendorParticipation: vendorPart,
        avgBidsPerTender: avgBids,
        collusionSuspects: collusion,
      };

      metricsCache.set(cacheKey, {
        data: response,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      return reply.send(response);
    },
  );

  // GET /v1/tenders/:id/export
  fastify.get(
    "/v1/tenders/:id/export",
    {
      preHandler: fastify.authorize(["ORG_ADMIN", "AUDITOR", "PROCUREMENT_MANAGER"]),
      schema: {
        params: z.object({ id: z.string().cuid() }).strict(),
      },
    },
    async (request, reply) => {
      const { id } = request.params as any;

      return await withRls(request.user, async (tx) => {
        // 1. Fetch tender
        const tender = await tx.tender.findUnique({
          where: { id },
        });
        if (!tender) {
          return reply.code(404).send({ message: "Tender not found" });
        }

        // 2. Fetch organization name
        const org = await tx.org.findUnique({
          where: { id: tender.orgId },
        });
        const orgName = org?.name || "Unknown Organization";

        // 3. Fetch bids and sort lexicographically by commitment
        const bidsRaw = await tx.bid.findMany({
          where: { tenderId: id },
        });

        const bids = bidsRaw
          .map((b: any) => {
            // Plaintext bid details can only be revealed if status is REVEALED or AWARDED
            const canReveal = tender.status === "REVEALED" || tender.status === "AWARDED";
            return {
              vendorHash: createHash("sha256").update(b.vendorId).digest("hex"),
              commitment: b.commitment,
              revealedAt: b.revealedAt,
              plaintextBid: canReveal ? b.plaintextBid : null,
              isValid: b.isValid,
            };
          })
          .sort((a: any, b: any) => a.commitment.localeCompare(b.commitment));

        // 4. Fetch audit logs sorted by createdAt
        const auditLogsRaw = await tx.auditLog.findMany({
          where: { tenderId: id },
          orderBy: { createdAt: "asc" },
        });

        const auditLogs = auditLogsRaw.map((log: any) => ({
          createdAt: log.createdAt,
          eventType: log.eventType,
          actorId: log.actorId,
          eventHash: log.eventHash || "0x",
          prevHash: log.prevHash || "0x",
        }));

        // 5. Build two-pass deterministic PDF rendering
        // Format tender revealTime into YYYYMMDDHHmmSSZ format
        const dateStr =
          new Date(tender.revealTime).toISOString().replace(/[-:T]/g, "").slice(0, 14) + "Z";

        // Pass 1: Render with placeholder hash to calculate PDF structure
        const firstPassReport = React.createElement(AuditReport, {
          tender: {
            id: tender.id,
            title: tender.title,
            revealTime: tender.revealTime,
            merkleRoot: tender.merkleRoot,
          },
          org: { name: orgName },
          bids,
          auditLogs,
          pdfHash: "PENDING_SHA256",
        });

        const firstPassBuffer = await pdf(firstPassReport).toBuffer();
        const cleanFirstPass = makePdfBufferDeterministic(firstPassBuffer, dateStr);

        // Calculate SHA256 of the structured first pass buffer
        const sha256Hash = createHash("sha256").update(cleanFirstPass).digest("hex");

        // Pass 2: Re-render inserting computed SHA256 hash
        const secondPassReport = React.createElement(AuditReport, {
          tender: {
            id: tender.id,
            title: tender.title,
            revealTime: tender.revealTime,
            merkleRoot: tender.merkleRoot,
          },
          org: { name: orgName },
          bids,
          auditLogs,
          pdfHash: sha256Hash,
        });

        const secondPassBuffer = await pdf(secondPassReport).toBuffer();
        const finalBuffer = makePdfBufferDeterministic(secondPassBuffer, dateStr);

        return reply
          .header("Content-Type", "application/pdf")
          .header("Content-Disposition", `attachment; filename="audit-report-${tender.id}.pdf"`)
          .send(finalBuffer);
      });
    },
  );
}
