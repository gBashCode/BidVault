import { PrismaClient } from "@prisma/client";
import { createCommitment } from "@sealedbid/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding SealedBid database...\n");

  // ─── 1. Create Org ──────────────────────────────────────────
  const org = await prisma.org.create({
    data: {
      name: "Acme Gov",
      type: "GOVERNMENT",
    },
  });
  console.log(`✅ Org created: ${org.name} (${org.id})`);

  // ─── 2. Create Users ───────────────────────────────────────
  const procManager = await prisma.user.create({
    data: {
      orgId: org.id,
      email: "alice@acmegov.com",
      role: "PROCUREMENT_MANAGER",
    },
  });
  console.log(`✅ User created: ${procManager.email} (${procManager.role})`);

  const vendor1 = await prisma.user.create({
    data: {
      orgId: org.id,
      email: "bob@vendor.com",
      role: "VENDOR",
    },
  });
  console.log(`✅ User created: ${vendor1.email} (${vendor1.role})`);

  const vendor2 = await prisma.user.create({
    data: {
      orgId: org.id,
      email: "carol@vendor.com",
      role: "VENDOR",
    },
  });
  console.log(`✅ User created: ${vendor2.email} (${vendor2.role})`);

  // ─── 3. Create Tender ──────────────────────────────────────
  const now = new Date();
  const submissionDeadline = new Date(now.getTime() + 1 * 60 * 1000); // now + 1 min
  const revealTime = new Date(now.getTime() + 2 * 60 * 1000); // now + 2 min

  const tender = await prisma.tender.create({
    data: {
      orgId: org.id,
      createdById: procManager.id,
      title: "Defense Systems Procurement Q4",
      description: "Request for proposals for tactical systems integration.",
      submissionDeadline,
      revealTime,
      status: "OPEN",
    },
  });
  console.log(`✅ Tender created: "${tender.title}" (${tender.id})`);
  console.log(`   Submission deadline: ${submissionDeadline.toISOString()}`);
  console.log(`   Reveal time:         ${revealTime.toISOString()}`);

  // ─── 4. Create Bids (Only commitments, plaintextBid = null) ──
  const bidData = { price: 100000, days: 30 };

  // Generating valid commitments using @sealedbid/crypto
  const salt1 = "seed_salt_vendor1_secure_32_chars_long";
  const commitment1 = createCommitment(bidData, salt1);
  const saltHash1 = createCommitment({ salt: salt1 }, salt1);

  const salt2 = "seed_salt_vendor2_secure_32_chars_long";
  const commitment2 = createCommitment(bidData, salt2);
  const saltHash2 = createCommitment({ salt: salt2 }, salt2);

  const bid1 = await prisma.bid.create({
    data: {
      tenderId: tender.id,
      vendorId: vendor1.id,
      commitment: commitment1,
      encryptedBlob: "s3://sealedbid-vault/bids/bob_encrypted.aes",
      saltHash: saltHash1,
    },
  });
  console.log(
    `✅ Bid 1 created for ${vendor1.email}: commitment=${bid1.commitment.slice(0, 18)}...`,
  );

  const bid2 = await prisma.bid.create({
    data: {
      tenderId: tender.id,
      vendorId: vendor2.id,
      commitment: commitment2,
      encryptedBlob: "s3://sealedbid-vault/bids/carol_encrypted.aes",
      saltHash: saltHash2,
    },
  });
  console.log(
    `✅ Bid 2 created for ${vendor2.email}: commitment=${bid2.commitment.slice(0, 18)}...`,
  );

  // ─── 5. Create initial AuditLog entry ────────────────────
  const genesisHash = "0x3a3c9b73489115b85e05c87910ff6aa9258286a6358dbb2cf41e8c9735d45464";

  const auditLog = await prisma.auditLog.create({
    data: {
      prevHash: genesisHash,
      eventType: "TENDER_CREATED",
      actorId: procManager.id,
      tenderId: tender.id,
      payload: { tenderId: tender.id, title: tender.title },
      eventHash: createCommitment(
        { prevHash: genesisHash, eventType: "TENDER_CREATED", tenderId: tender.id },
        salt1,
      ),
    },
  });
  console.log(`✅ AuditLog seeded (ID: ${auditLog.id})`);

  console.log("\n🎉 Seed complete!\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
