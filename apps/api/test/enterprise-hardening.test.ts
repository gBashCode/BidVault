import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/app.js";
import { prisma, mockRlsContext } from "@sealedbid/db";
import { createCommitment } from "@sealedbid/crypto";

describe("SealedBid API - Enterprise Hardening & Security Isolation", () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;

  const orgA = "org_a_enterprise";
  const orgB = "org_b_enterprise";

  const managerA = "mgr_a_enterprise";
  const managerB = "mgr_b_enterprise";
  const vendor1 = "vnd_1_enterprise";
  const vendor2 = "vnd_2_enterprise";

  let managerAToken: string;
  let managerBToken: string;
  let vendor1Token: string;
  let vendor2Token: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    request = supertest(app.server);

    // Sign jwt tokens
    managerAToken = app.jwt.sign({ id: managerA, orgId: orgA, role: "PROCUREMENT_MANAGER" });
    managerBToken = app.jwt.sign({ id: managerB, orgId: orgB, role: "PROCUREMENT_MANAGER" });
    vendor1Token = app.jwt.sign({ id: vendor1, orgId: orgA, role: "VENDOR" });
    vendor2Token = app.jwt.sign({ id: vendor2, orgId: orgA, role: "VENDOR" });

    // Seed mock DB context securely
    try {
      // Clear any prior RLS state to bypass policies during seeding
      if (mockRlsContext) {
        mockRlsContext.currentUserId = null;
        mockRlsContext.currentOrgId = null;
      }

      await prisma.org
        .create({ data: { id: orgA, name: "Organization A", type: "GOVERNMENT" } })
        .catch(() => {});
      await prisma.org
        .create({ data: { id: orgB, name: "Organization B", type: "ENTERPRISE" } })
        .catch(() => {});

      await prisma.user
        .create({
          data: {
            id: managerA,
            orgId: orgA,
            email: "mgr-a@org-a.com",
            role: "PROCUREMENT_MANAGER",
          },
        })
        .catch(() => {});
      await prisma.user
        .create({
          data: {
            id: managerB,
            orgId: orgB,
            email: "mgr-b@org-b.com",
            role: "PROCUREMENT_MANAGER",
          },
        })
        .catch(() => {});

      await prisma.user
        .create({ data: { id: vendor1, orgId: orgA, email: "vnd-1@org-a.com", role: "VENDOR" } })
        .catch(() => {});
      await prisma.user
        .create({ data: { id: vendor2, orgId: orgA, email: "vnd-2@org-a.com", role: "VENDOR" } })
        .catch(() => {});
    } catch (e) {
      console.log("Seeding skipped in test environment");
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("should isolate tenants using Postgres RLS and verify secure S3 presigned POST flows", async () => {
    // ─── Step 1: Manager A creates a Tender ───
    const now = Date.now();
    const submissionDeadline = new Date(now + 2000).toISOString();
    const revealTime = new Date(now + 4000).toISOString();

    const createRes = await request
      .post("/v1/tenders")
      .set("Authorization", `Bearer ${managerAToken}`)
      .send({
        title: "Fighter Jet Spare Parts",
        description: "Procurement of military aerospace hardware.",
        submissionDeadline,
        revealTime,
      });

    expect(createRes.status).toBe(201);
    const tenderId = createRes.body.id;
    expect(createRes.body.orgId).toBe(orgA);

    // Publish Tender
    const publishRes = await request
      .patch(`/v1/tenders/${tenderId}/publish`)
      .set("Authorization", `Bearer ${managerAToken}`);
    expect(publishRes.status).toBe(200);

    // ─── Step 2: Manager B from Org B tries to access Org A\'s Tender (Tenant Isolation check) ───
    const getRes = await request
      .get(`/v1/tenders/${tenderId}`)
      .set("Authorization", `Bearer ${managerBToken}`);
    // Since Manager B is isolated from Org A via RLS, they must not see it (it returns 404/not found or similar)
    expect(getRes.status).toBe(404);

    // ─── Step 3: Vendor 1 submits a bid without handling raw bytes (Zero API Bytes) ───
    const bidData = { unitPrice: 450000, qty: 5 };
    const salt = "salt_enterprise_hardening_32_chars";
    const commitment = createCommitment(bidData, salt);
    const saltHash = createCommitment({ salt }, salt);

    const submitRes = await request
      .post(`/v1/tenders/${tenderId}/bids`)
      .set("Authorization", `Bearer ${vendor1Token}`)
      .send({
        commitment,
        saltHash,
      });

    // Response must return 201 along with S3 Presigned fields
    expect(submitRes.status).toBe(201);
    expect(submitRes.body.id).toBeDefined();
    expect(submitRes.body.uploadUrl).toBeDefined();
    expect(submitRes.body.uploadFields).toBeDefined();
    expect(submitRes.body.encryptedBlob).toBeUndefined(); // API never leaks or returns internal S3 paths

    const bidId = submitRes.body.id;

    // ─── Step 4: Early reveal attempt triggers alert and logs event ───
    const earlyRevealRes = await request
      .post(`/v1/bids/${bidId}/reveal`)
      .set("Authorization", `Bearer ${vendor1Token}`)
      .send({
        plaintextBid: bidData,
        salt,
      });

    expect(earlyRevealRes.status).toBe(423); // Locked

    // Verify early reveal security alert in AuditLog
    if (mockRlsContext) {
      mockRlsContext.currentUserId = null;
      mockRlsContext.currentOrgId = null;
    }
    const auditLogs = await prisma.auditLog.findMany({});
    const earlyRevealLog = auditLogs.find((l) => l.eventType === "SECURITY_ALERT_EARLY_REVEAL");
    expect(earlyRevealLog).toBeDefined();
    expect(earlyRevealLog?.tenderId).toBe(tenderId);
    expect(earlyRevealLog?.actorId).toBe(vendor1);

    // ─── Step 5: Commitment mismatch triggers alert and logs event ───
    // Bypass RLS to move revealTime into the past so reveal is open
    try {
      if (mockRlsContext) {
        mockRlsContext.currentUserId = null;
        mockRlsContext.currentOrgId = null;
      }
      // Transition to SEALED first to bypass open date modification restriction
      await prisma.tender.update({
        where: { id: tenderId },
        data: { status: "SEALED" },
      });
      await prisma.tender.update({
        where: { id: tenderId },
        data: {
          submissionDeadline: new Date(now - 10000),
          revealTime: new Date(now - 5000),
        },
      });
    } catch (e) {
      console.error("Date update failed in test:", e);
    }

    // Reveal with incorrect plaintext/salt
    const badRevealRes = await request
      .post(`/v1/bids/${bidId}/reveal`)
      .set("Authorization", `Bearer ${vendor1Token}`)
      .send({
        plaintextBid: { unitPrice: 10 },
        salt: "wrong_salt_value_for_commitment_mismatch",
      });

    expect(badRevealRes.status).toBe(400);

    const auditLogsAfterMismatch = await prisma.auditLog.findMany({});
    const mismatchLog = auditLogsAfterMismatch.find(
      (l) => l.eventType === "SECURITY_ALERT_COMMITMENT_MISMATCH",
    );
    expect(mismatchLog).toBeDefined();
    expect(mismatchLog?.tenderId).toBe(tenderId);
    expect(mismatchLog?.actorId).toBe(vendor1);

    // ─── Step 6: Auth and role guard failures trigger alerts and logs ───
    // 1. Authentication failure (Invalid JWT)
    const invalidAuthRes = await request
      .get(`/v1/tenders/${tenderId}/bids`)
      .set("Authorization", "Bearer invalid_token_bytes_here");
    expect(invalidAuthRes.status).toBe(401);

    // 2. Authorization failure (Forbidden - Vendor accessing Manager endpoint)
    const forbiddenAuthRes = await request
      .get(`/v1/tenders/${tenderId}/bids`)
      .set("Authorization", `Bearer ${vendor1Token}`);
    expect(forbiddenAuthRes.status).toBe(403);

    // Verify auth security logs
    const finalAuditLogs = await prisma.auditLog.findMany({});
    const unauthorizedLog = finalAuditLogs.find(
      (l) => l.eventType === "SECURITY_ALERT_UNAUTHORIZED",
    );
    const forbiddenLog = finalAuditLogs.find((l) => l.eventType === "SECURITY_ALERT_FORBIDDEN");

    expect(unauthorizedLog).toBeDefined();
    expect(forbiddenLog).toBeDefined();
    expect(forbiddenLog?.actorId).toBe(vendor1);
  });
});
