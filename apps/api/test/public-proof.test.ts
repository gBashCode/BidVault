import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { buildApp } from "../src/app.js";
import { prisma, mockRlsContext } from "@sealedbid/db";
import { createCommitment, buildTenderMerkleTree, verifyMerkleProof } from "@sealedbid/crypto";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

describe("SealedBid API - Public Proof Generation & Verification", () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;

  let managerToken: string;
  const vendorTokens: string[] = [];

  const orgId = "org_proof_test";
  const managerId = "mgr_proof_test";
  const vendorIds = ["vnd_proof_1", "vnd_proof_2", "vnd_proof_3"];

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

    for (const vId of vendorIds) {
      vendorTokens.push(
        app.jwt.sign({
          id: vId,
          orgId,
          role: "VENDOR",
        }),
      );
    }

    // Seed test org and users if DB is connected
    try {
      await prisma.org
        .create({
          data: { id: orgId, name: "Proof Integration Org", type: "GOVERNMENT" },
        })
        .catch(() => {});
      await prisma.user
        .create({
          data: { id: managerId, orgId, email: `mgr-proof@test.com`, role: "PROCUREMENT_MANAGER" },
        })
        .catch(() => {});

      for (const vId of vendorIds) {
        await prisma.user
          .create({
            data: { id: vId, orgId, email: `vnd-${vId}@test.com`, role: "VENDOR" },
          })
          .catch(() => {});
      }
    } catch (e) {
      console.log("🧪 DB seeding skipped or failed in test (possible offline sandbox).");
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it("should generate, retrieve, and verify public Merkle proofs", async () => {
    // ─── Step 1: Create Tender (DRAFT) ───
    const now = Date.now();
    const submissionDeadline = new Date(now + 2000).toISOString();
    const revealTime = new Date(now + 3000).toISOString();

    const createRes = await request
      .post("/v1/tenders")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({
        title: "Tactical Drone Procurement",
        description: "Secure drone swarms.",
        submissionDeadline,
        revealTime,
      });

    expect(createRes.status).toBe(201);
    const tenderId = createRes.body.id;

    // ─── Step 2: Publish Tender ───
    const publishRes = await request
      .patch(`/v1/tenders/${tenderId}/publish`)
      .set("Authorization", `Bearer ${managerToken}`);
    expect(publishRes.status).toBe(200);

    // ─── Step 3: 3 Vendors Submit Bids ───
    const bidDatas = [
      { price: 10000, currency: "USD" },
      { price: 15000, currency: "USD" },
      { price: 12000, currency: "USD" },
    ];
    const salts = [
      "salt_vendor_1_integration_test_l32",
      "salt_vendor_2_integration_test_l32",
      "salt_vendor_3_integration_test_l32",
    ];

    const commitments: string[] = [];

    for (let i = 0; i < 3; i++) {
      const commitment = createCommitment(bidDatas[i], salts[i]);
      commitments.push(commitment);

      const saltHash = createCommitment({ salt: salts[i] }, salts[i]);

      const submitRes = await request
        .post(`/v1/tenders/${tenderId}/bids`)
        .set("Authorization", `Bearer ${vendorTokens[i]}`)
        .send({
          commitment,
          saltHash,
          encryptedBlob: `https://vault/bids/drone_${i}.enc`,
        });

      expect(submitRes.status).toBe(201);
    }

    // ─── Step 4: Simulate Transition to REVEALED state in DB ───
    const { root: merkleRoot } = buildTenderMerkleTree(commitments);

    try {
      // Clear RLS context to bypass policies as superuser/db owner
      if (mockRlsContext) {
        mockRlsContext.currentUserId = null;
        mockRlsContext.currentOrgId = null;
      }

      // Transition tender to SEALED first so we can modify the dates without violating the OPEN constraint
      await prisma.tender.update({
        where: { id: tenderId },
        data: { status: "SEALED" },
      });

      // Move revealTime and submissionDeadline to the past to satisfy database-level guard constraints
      await prisma.tender.update({
        where: { id: tenderId },
        data: {
          submissionDeadline: new Date(Date.now() - 10000),
          revealTime: new Date(Date.now() - 5000),
        },
      });

      // Transition tender to REVEALED & save merkleRoot
      await prisma.tender.update({
        where: { id: tenderId },
        data: { status: "REVEALED", merkleRoot },
      });

      // Simulate bid reveals
      const dbBids = await prisma.bid.findMany({ where: { tenderId } });
      for (let i = 0; i < dbBids.length; i++) {
        const matchingVendorIdx = vendorIds.indexOf(dbBids[i].vendorId);
        await prisma.bid.update({
          where: { id: dbBids[i].id },
          data: {
            plaintextBid: JSON.stringify(bidDatas[matchingVendorIdx]),
            revealSalt: salts[matchingVendorIdx],
            isValid: true,
            revealedAt: new Date(),
          },
        });
      }
    } catch (e) {
      console.error("Failed to transition or reveal in test DB:", e);
    }

    // ─── Step 5: GET Public Proof Endpoint ───
    const proofRes = await request.get(`/v1/public/tenders/${tenderId}/proof`);
    expect(proofRes.status).toBe(200);

    const data = proofRes.body;
    expect(data.tenderId).toBe(tenderId);
    expect(data.merkleRoot).toBe(merkleRoot);
    expect(data.status).toBe("REVEALED");
    expect(data.bids.length).toBe(3);

    // ─── Step 6: Verify Each Bid Proof ───
    for (const bidItem of data.bids) {
      expect(bidItem.commitment).toBeDefined();
      expect(bidItem.merkleProof).toBeDefined();
      expect(bidItem.revealed).toBeDefined();
      expect(bidItem.revealed.isValid).toBe(true);

      // Verify the Merkle Proof against the Root client-side
      const verified = verifyMerkleProof(data.merkleRoot, bidItem.commitment, bidItem.merkleProof);
      expect(verified).toBe(true);

      // ─── Step 7: Tamper and Assert Failure ───
      // Tampering with the leaf/commitment
      const tamperedCommitment = "0x" + "f".repeat(64);
      const verifiedTamperedCommitment = verifyMerkleProof(
        data.merkleRoot,
        tamperedCommitment,
        bidItem.merkleProof,
      );
      expect(verifiedTamperedCommitment).toBe(false);

      // Tampering with the proof array
      const tamperedProof = [...bidItem.merkleProof];
      if (tamperedProof.length > 0) {
        tamperedProof[0] = "0x" + "e".repeat(64);
        const verifiedTamperedProof = verifyMerkleProof(
          data.merkleRoot,
          bidItem.commitment,
          tamperedProof,
        );
        expect(verifiedTamperedProof).toBe(false);
      }
    }

    // ─── Step 8: Verify Anonymization & Vendor Match ───
    for (let i = 0; i < 3; i++) {
      const vId = vendorIds[i];
      // Recompute locally as a Vendor
      const vendorHashBytes = keccak_256(utf8ToBytes(vId + tenderId));
      const myVendorHash = "0x" + bytesToHex(vendorHashBytes);

      // Assert it differs from raw vendorId
      expect(myVendorHash).not.toBe(vId);

      // Assert vendor can locate their bid in the public payload
      const foundBid = data.bids.find((b: any) => b.vendorHash === myVendorHash);
      expect(foundBid).toBeDefined();
      expect(foundBid.commitment).toBe(commitments[i]);
      expect(foundBid.revealed.plaintextBid).toEqual(bidDatas[i]);
    }

    // ─── Step 9: POST /v1/public/verify endpoint ───
    const firstBid = data.bids[0];
    const apiVerifyRes = await request.post("/v1/public/verify").send({
      merkleRoot: data.merkleRoot,
      leaf: firstBid.commitment,
      proof: firstBid.merkleProof,
    });

    expect(apiVerifyRes.status).toBe(200);
    expect(apiVerifyRes.body.valid).toBe(true);

    // Tampered verification request through API
    const apiVerifyResTampered = await request.post("/v1/public/verify").send({
      merkleRoot: data.merkleRoot,
      leaf: "0x" + "f".repeat(64),
      proof: firstBid.merkleProof,
    });

    expect(apiVerifyResTampered.status).toBe(200);
    expect(apiVerifyResTampered.body.valid).toBe(false);
  });
});
