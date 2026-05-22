import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { createServer, Server } from "http";
import { createHash, createHmac } from "crypto";
import { buildApp } from "../src/app.js";
import { prisma, mockRlsContext, mockDb } from "@sealedbid/db";

describe("SealedBid API - Enterprise Compliance & Webhook Layer", () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;
  let mockReceiver: Server;
  let receiverPort: number;
  let receivedWebhook: {
    headers: any;
    body: string;
    payload: any;
  } | null = null;

  // Conforms to Zod .cuid() format (starts with c, alphanumeric, length 25)
  const orgId = "corgcompliance12345678901";
  const adminId = "cadmcompliance12345678901";
  const managerId = "cmgrcompliance12345678901";
  const vendorId = "cvndcompliance12345678901";
  const tender1Id = "ctndcompliance112345678901";
  const tender2Id = "ctndcompliance212345678901";
  const tender3Id = "ctndcompliance312345678901";
  const bid1Id = "cbidcompliance112345678901";
  const bid2Id = "cbidcompliance212345678901";

  let adminToken: string;
  let managerToken: string;
  let vendorToken: string;

  beforeAll(async () => {
    // Set NODE_ENV to test to bypass local SSRF webhook check
    process.env.NODE_ENV = "test";

    app = buildApp();
    await app.ready();
    request = supertest(app.server);

    // Sign jwt tokens
    adminToken = app.jwt.sign({ id: adminId, orgId, role: "ORG_ADMIN" });
    managerToken = app.jwt.sign({ id: managerId, orgId, role: "PROCUREMENT_MANAGER" });
    vendorToken = app.jwt.sign({ id: vendorId, orgId, role: "VENDOR" });

    // Seed mock DB context securely
    try {
      if (mockRlsContext) {
        mockRlsContext.currentUserId = null;
        mockRlsContext.currentOrgId = null;
      }

      await prisma.org
        .create({ data: { id: orgId, name: "Compliance Test Org", type: "ENTERPRISE" } })
        .catch(() => {});
      await prisma.user
        .create({ data: { id: adminId, orgId, email: "admin@compliance.com", role: "ORG_ADMIN" } })
        .catch(() => {});
      await prisma.user
        .create({
          data: {
            id: managerId,
            orgId,
            email: "manager@compliance.com",
            role: "PROCUREMENT_MANAGER",
          },
        })
        .catch(() => {});
      await prisma.user
        .create({ data: { id: vendorId, orgId, email: "vendor@compliance.com", role: "VENDOR" } })
        .catch(() => {});
    } catch (e) {
      console.log("Compliance seeding skipped or already done");
    }

    // Start a local HTTP server to receive and verify webhook dispatches
    await new Promise<void>((resolve) => {
      mockReceiver = createServer((req, res) => {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          receivedWebhook = {
            headers: req.headers,
            body,
            payload: JSON.parse(body),
          };
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "received" }));
        });
      });

      mockReceiver.listen(0, "127.0.0.1", () => {
        const addr = mockReceiver.address() as any;
        receiverPort = addr.port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await app.close();
    await new Promise<void>((resolve) => {
      mockReceiver.close(() => resolve());
    });
  });

  // ─── Test Suite 1: Compliance Metrics ───
  describe("GET /v1/org/:orgId/metrics", () => {
    it("should calculate metrics and cache them for 5 minutes", async () => {
      // Seed several tenders with different statuses and bids
      const now = Date.now();

      if (mockRlsContext) {
        mockRlsContext.currentUserId = null;
        mockRlsContext.currentOrgId = null;
      }

      // Create Tenders
      await prisma.tender.create({
        data: {
          id: tender1Id,
          orgId,
          title: "Construction Materials Tender",
          description: "Supply of bricks and steel.",
          status: "AWARDED",
          submissionDeadline: new Date(now - 100000),
          revealTime: new Date(now - 50000),
        },
      });

      await prisma.tender.create({
        data: {
          id: tender2Id,
          orgId,
          title: "IT Support Tender",
          description: "Helpdesk services.",
          status: "REVEALED",
          submissionDeadline: new Date(now - 100000),
          revealTime: new Date(now - 50000),
        },
      });

      // Create Bids
      await prisma.bid.create({
        data: {
          id: bid1Id,
          tenderId: tender1Id,
          vendorId,
          commitment: "0x1111111111111111111111111111111111111111111111111111111111111111",
          saltHash: "0x1234",
          plaintextBid: JSON.stringify({ price: 150000 }),
          isValid: true,
          revealedAt: new Date(now - 49000), // Within 5 minutes of revealTime
          submittedAt: new Date(now - 99000),
        },
      });

      await prisma.bid.create({
        data: {
          id: bid2Id,
          tenderId: tender2Id,
          vendorId,
          commitment: "0x2222222222222222222222222222222222222222222222222222222222222222",
          saltHash: "0x5678",
          plaintextBid: JSON.stringify({ price: 200000 }),
          isValid: false, // Disputed bid
          revealedAt: new Date(now - 40000), // Within 5 minutes
          submittedAt: new Date(now - 99000),
        },
      });

      // Query metrics
      const metricsRes = await request
        .get(`/v1/org/${orgId}/metrics`)
        .set("Authorization", `Bearer ${managerToken}`);

      if (metricsRes.status !== 200) {
        console.error("METRICS FAILED:", metricsRes.status, metricsRes.body);
      }

      expect(metricsRes.status).toBe(200);
      expect(metricsRes.body.totalTenders).toBe(2);
      expect(metricsRes.body.disputeRate).toBe(50); // 1 out of 2 bids is invalid
      expect(metricsRes.body.onTimeRevealRate).toBe(100); // both first reveals within 5 minutes
      expect(metricsRes.body.totalValueAwarded).toBe(150000); // only tender1 is AWARDED
      expect(metricsRes.body.monthlyVolume).toBeDefined();
      expect(metricsRes.body.vendorParticipation).toBeDefined();
      expect(metricsRes.body.avgBidsPerTender).toBe(1);
      expect(metricsRes.body.collusionSuspects).toBeDefined();

      // Test 5-minute memory caching: Add a new tender, query again. Since it's cached, count should still be 2.
      await prisma.tender.create({
        data: {
          id: tender3Id,
          orgId,
          title: "Uncached Tender",
          description: "Should not affect cached result.",
          status: "DRAFT",
          submissionDeadline: new Date(now + 100000),
          revealTime: new Date(now + 200000),
        },
      });

      const metricsResCached = await request
        .get(`/v1/org/${orgId}/metrics`)
        .set("Authorization", `Bearer ${managerToken}`);

      expect(metricsResCached.status).toBe(200);
      expect(metricsResCached.body.totalTenders).toBe(2); // Still 2 due to the 5-minute memory cache
    });

    it("should block non-organization users or incorrect roles", async () => {
      const wrongOrgToken = app.jwt.sign({
        id: "wrong_user",
        orgId: "cwrongorg12345678901234",
        role: "PROCUREMENT_MANAGER",
      });
      const badRes = await request
        .get(`/v1/org/${orgId}/metrics`)
        .set("Authorization", `Bearer ${wrongOrgToken}`);

      expect(badRes.status).toBe(403);

      const vendorRes = await request
        .get(`/v1/org/${orgId}/metrics`)
        .set("Authorization", `Bearer ${vendorToken}`);

      // Vendors do not have PROCUREMENT_MANAGER, AUDITOR, or ORG_ADMIN roles
      expect(vendorRes.status).toBe(403);
    });
  });

  // ─── Test Suite 2: Deterministic PDF Export ───
  describe("GET /v1/tenders/:id/export", () => {
    it("should export a 100% byte-identical PDF across repeated requests", async () => {
      const exportRes1 = await request
        .get(`/v1/tenders/${tender1Id}/export`)
        .set("Authorization", `Bearer ${managerToken}`);

      if (exportRes1.status !== 200) {
        console.error("EXPORT FAILED:", exportRes1.status, exportRes1.body);
      }

      expect(exportRes1.status).toBe(200);
      expect(exportRes1.headers["content-type"]).toBe("application/pdf");
      expect(exportRes1.headers["content-disposition"]).toContain(
        `attachment; filename="audit-report-${tender1Id}.pdf"`,
      );

      const pdfBuffer1 = exportRes1.body;
      expect(pdfBuffer1).toBeInstanceOf(Buffer);

      // Repeat request
      const exportRes2 = await request
        .get(`/v1/tenders/${tender1Id}/export`)
        .set("Authorization", `Bearer ${managerToken}`);

      expect(exportRes2.status).toBe(200);
      const pdfBuffer2 = exportRes2.body;

      // Assert they are 100% byte-identical
      expect(pdfBuffer1.length).toBe(pdfBuffer2.length);
      expect(pdfBuffer1.equals(pdfBuffer2)).toBe(true);

      // Verify hashes are identical
      const hash1 = createHash("sha256").update(pdfBuffer1).digest("hex");
      const hash2 = createHash("sha256").update(pdfBuffer2).digest("hex");
      expect(hash1).toBe(hash2);
    });

    it("should prevent access to non-existent or unauthorized tenders", async () => {
      const wrongOrgToken = app.jwt.sign({
        id: "wrong_user",
        orgId: "cwrongorg12345678901234",
        role: "PROCUREMENT_MANAGER",
      });
      const badRes = await request
        .get(`/v1/tenders/${tender1Id}/export`)
        .set("Authorization", `Bearer ${wrongOrgToken}`);

      expect(badRes.status).toBe(404); // Isolated via RLS, returns 404/not found
    });
  });

  // ─── Test Suite 3: Webhook CRUDR & Secrets ───
  describe("Webhook Management Routes", () => {
    let webhookId: string;
    let initialSecret: string;

    it("should register a webhook with a secure, auto-generated secret key", async () => {
      const createRes = await request
        .post(`/v1/org/${orgId}/webhooks`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          url: `http://127.0.0.1:${receiverPort}/webhook-endpoint`,
          events: ["bid.submitted", "tender.revealed"],
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.id).toBeDefined();
      expect(createRes.body.url).toBe(`http://127.0.0.1:${receiverPort}/webhook-endpoint`);
      expect(createRes.body.events).toContain("bid.submitted");
      expect(createRes.body.isActive).toBe(true);
      expect(createRes.body.secret).toBeUndefined(); // Should never leak secret on creation response

      webhookId = createRes.body.id;

      // Find the secret directly from mock DB to use later
      const dbWebhook = mockDb.webhooks.find((w) => w.id === webhookId);
      expect(dbWebhook).toBeDefined();
      expect(dbWebhook.secret).toHaveLength(64); // 32-byte hex
      initialSecret = dbWebhook.secret;
    });

    it("should list active webhooks and hide their secrets", async () => {
      const listRes = await request
        .get(`/v1/org/${orgId}/webhooks`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body).toBeInstanceOf(Array);
      expect(listRes.body.length).toBeGreaterThanOrEqual(1);

      const item = listRes.body.find((w: any) => w.id === webhookId);
      expect(item).toBeDefined();
      expect(item.secret).toBeUndefined(); // Strictly hidden
    });

    it("should rotate webhook secrets securely", async () => {
      const rotateRes = await request
        .patch(`/v1/webhooks/${webhookId}/rotate-secret`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(rotateRes.status).toBe(200);
      expect(rotateRes.body.id).toBe(webhookId);
      expect(rotateRes.body.secret).toBeUndefined(); // Still hidden in standard JSON reply

      const dbWebhook = mockDb.webhooks.find((w) => w.id === webhookId);
      expect(dbWebhook.secret).not.toBe(initialSecret);
      expect(dbWebhook.secret).toHaveLength(64);
    });
  });

  // ─── Test Suite 4: Signed Webhooks & Replay Protections ───
  describe("Webhook Event Dispatch & Signature Verification", () => {
    it("should sign webhook payloads with HMAC-SHA256 and include replay headers", async () => {
      receivedWebhook = null; // Reset receiver state

      // 1. Register a webhook for 'bid.submitted' pointing to our mock receiver
      const localWebhookUrl = `http://127.0.0.1:${receiverPort}/webhook-endpoint`;

      // Let's clear webhooks and create exactly one for the test
      mockDb.webhooks = [];
      const createRes = await request
        .post(`/v1/org/${orgId}/webhooks`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          url: localWebhookUrl,
          events: ["bid.submitted"],
        });

      expect(createRes.status).toBe(201);
      const wId = createRes.body.id;

      // Get the secret from DB
      const dbWebhook = mockDb.webhooks.find((w) => w.id === wId);
      const secret = dbWebhook.secret;

      // 2. Trigger event: submit a new bid on a tender (triggers 'bid.submitted' hook)
      // First ensure tender is open/published
      const tenderId = "ctndcompliance212345678901";
      await prisma.tender.update({
        where: { id: tenderId },
        data: {
          status: "OPEN",
          submissionDeadline: new Date(Date.now() + 100000),
        },
      });

      // Submit bid
      const submitBidRes = await request
        .post(`/v1/tenders/${tenderId}/bids`)
        .set("Authorization", `Bearer ${vendorToken}`)
        .send({
          commitment: "0x3333333333333333333333333333333333333333333333333333333333333333",
          saltHash: "0x9abc" + "0".repeat(60),
        });

      expect(submitBidRes.status).toBe(201);

      // Wait a moment for setImmediate mock queue to dispatch to receiver
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Assert receiver got the webhook
      expect(receivedWebhook).not.toBeNull();
      const hook = receivedWebhook!;

      // Verify headers
      expect(hook.headers["x-sealedbid-signature"]).toBeDefined();
      expect(hook.headers["x-sealedbid-timestamp"]).toBeDefined();
      expect(hook.headers["x-sealedbid-nonce"]).toBeDefined();

      const signature = hook.headers["x-sealedbid-signature"];
      const timestamp = hook.headers["x-sealedbid-timestamp"];
      const nonce = hook.headers["x-sealedbid-nonce"];

      // Verify HMAC-SHA256 signature
      const expectedInput = `${timestamp}.${nonce}.${hook.body}`;
      const expectedSignature = createHmac("sha256", secret).update(expectedInput).digest("hex");
      expect(signature).toBe(expectedSignature);

      // Verify tamper-proofing: modifying payload results in mismatch
      const tamperedBody = hook.body + " ";
      const tamperedInput = `${timestamp}.${nonce}.${tamperedBody}`;
      const badSignature = createHmac("sha256", secret).update(tamperedInput).digest("hex");
      expect(signature).not.toBe(badSignature);

      // Verify timestamp freshness (replay attack prevention)
      const parsedTime = parseInt(timestamp, 10);
      expect(Date.now() - parsedTime).toBeLessThan(5000); // Received within 5 seconds of creation
    });
  });
});
