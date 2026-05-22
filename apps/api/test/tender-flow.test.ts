import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "@sealedbid/db";
import { createCommitment } from "@sealedbid/crypto";

describe("SealedBid API - Complete Tender + Bid Lifecycle", () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;
  let managerToken: string;
  let vendorToken: string;
  const orgId = "org_" + Math.random().toString(36).slice(2);
  const managerId = "mgr_" + Math.random().toString(36).slice(2);
  const vendorId = "vnd_" + Math.random().toString(36).slice(2);

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    request = supertest(app.server);

    // Sign test tokens
    managerToken = app.jwt.sign({
      id: managerId,
      orgId,
      role: "PROCUREMENT_MANAGER",
    });

    vendorToken = app.jwt.sign({
      id: vendorId,
      orgId,
      role: "VENDOR",
    });

    // Seed test org and users if DB is connected
    try {
      await prisma.org
        .create({
          data: { id: orgId, name: "Integration Test Org", type: "GOVERNMENT" },
        })
        .catch(() => {});
      await prisma.user
        .create({
          data: {
            id: managerId,
            orgId,
            email: `mgr-${managerId}@test.com`,
            role: "PROCUREMENT_MANAGER",
          },
        })
        .catch(() => {});
      await prisma.user
        .create({
          data: { id: vendorId, orgId, email: `vnd-${vendorId}@test.com`, role: "VENDOR" },
        })
        .catch(() => {});
    } catch (e) {
      // Offline fallback: we will mock prisma or rely on fallback if configured
      console.log("🧪 DB seeding skipped or failed in test (possible offline sandbox).");
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("should run the full tender + bid flow successfully", async () => {
    // ─── Step 1: Create Tender (DRAFT) ───
    const now = Date.now();
    // Submission deadline in 2s, reveal in 3s
    const submissionDeadline = new Date(now + 2000).toISOString();
    const revealTime = new Date(now + 3000).toISOString();

    const createRes = await request
      .post("/v1/tenders")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        title: "Tactical Radio Procurement",
        description: "Provide high-frequency secure radio systems.",
        submissionDeadline,
        revealTime,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("DRAFT");
    const tenderId = createRes.body.id;

    // ─── Step 2: Publish Tender ───
    const publishRes = await request
      .patch(`/v1/tenders/${tenderId}/publish`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.status).toBe("OPEN");

    // ─── Step 3: Submit Bid (VENDOR) ───
    const bidData = { price: 85000, currency: "USD" };
    const salt = "test_salt_integration_flow_32_chars_l";
    const commitment = createCommitment(bidData, salt);
    const saltHash = createCommitment({ salt }, salt);

    const submitRes = await request
      .post(`/v1/tenders/${tenderId}/bids`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({
        commitment,
        saltHash,
        encryptedBlob: "https://sealedbid-vault.s3.amazonaws.com/bids/bid1.enc",
      });

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.id).toBeDefined();
    const bidId = submitRes.body.id;

    // ─── Step 4: Try reveal before revealTime ───
    const earlyRevealRes = await request
      .post(`/v1/bids/${bidId}/reveal`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({
        plaintextBid: bidData,
        salt,
      });

    expect(earlyRevealRes.status).toBe(423); // Locked

    // ─── Step 5: Wait until revealTime has passed ───
    await new Promise((resolve) => setTimeout(resolve, 3500));

    // ─── Step 6: Reveal Bid successfully ───
    const revealRes = await request
      .post(`/v1/bids/${bidId}/reveal`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({
        plaintextBid: bidData,
        salt,
      });

    expect(revealRes.status).toBe(200);
    expect(revealRes.body.isValid).toBe(true);
    expect(revealRes.body.plaintextBid).toEqual(bidData);

    // ─── Step 7: Manager GETs bids and sees plaintext ───
    // Let's also update the tender status to REVEALED in mock/db to allow managers to view it
    try {
      await prisma.tender
        .update({
          where: { id: tenderId },
          data: { status: "REVEALED" },
        })
        .catch(() => {});
    } catch (e) {}

    const getBidsRes = await request
      .get(`/v1/tenders/${tenderId}/bids`)
      .set("Authorization", `Bearer ${managerToken}`);

    expect(getBidsRes.status).toBe(200);
    const bidItem = getBidsRes.body.find((b: any) => b.id === bidId);
    expect(bidItem).toBeDefined();
    expect(bidItem.plaintextBid).toEqual(bidData);

    // ─── Step 8: Public verify endpoint ───
    const verifyRes = await request.get(`/v1/public/verify/bid/${bidId}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.commitment).toBe(commitment);
    expect(verifyRes.body.isValid).toBe(true);
    expect(verifyRes.body.plaintextBid).toEqual(bidData);
  });
});
