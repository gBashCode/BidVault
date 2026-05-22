import { assertTimeSync } from "../lib/time-guard.js";
import { prisma } from "@sealedbid/db";
import { AuditChain, buildTenderMerkleTree } from "@sealedbid/crypto";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";
import { createQueue } from "../lib/queue-factory.js";
import { getWebhookQueue } from "./webhook.queue.js";

export const queueName = "tender-lifecycle";

let lifecycleQueue: any = null;

export async function getQueue() {
  if (!lifecycleQueue) {
    lifecycleQueue = await createQueue(queueName);
  }
  return lifecycleQueue;
}

export function computeMerkleRoot(commitments: string[]): string {
  const { root } = buildTenderMerkleTree(commitments);
  return root;
}

/**
 * Job: 'check-reveals'
 * Runs: every 30s
 * Logic:
 * 1. assertTimeSync()
 * 2. Find OPEN tenders past revealTime (up to 1 hour ago)
 * 3. Add 'seal-tender' job for each
 */
export async function handleCheckReveals(): Promise<void> {
  await assertTimeSync();

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const openTenders = await prisma.tender.findMany({
    where: {
      status: "OPEN",
      revealTime: {
        lte: now,
        gt: oneHourAgo,
      },
    },
    select: { id: true },
  });

  const q = await getQueue();
  for (const tender of openTenders) {
    await q.add(
      "seal-tender",
      { tenderId: tender.id },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    );
  }
}

/**
 * Job: 'seal-tender'
 * Logic:
 * 1. Transaction: UPDATE Tender SET status='SEALED' WHERE id=? AND status='OPEN'
 * 2. If 0 rows updated, skip (idempotency)
 * 3. Create AuditLog: TENDER_SEALED, chaining from last log
 * 4. Add delayed job 'reveal-tender' with 60s delay
 */
export async function handleSealTender(tenderId: string): Promise<void> {
  const updateResult = await prisma.tender.updateMany({
    where: {
      id: tenderId,
      status: "OPEN",
    },
    data: {
      status: "SEALED",
    },
  });

  if (updateResult.count === 0) {
    return;
  }

  const lastAudit = await prisma.auditLog.findFirst({
    where: { tenderId },
    orderBy: { id: "desc" },
  });

  const lastHash = lastAudit?.eventHash;
  const chain = new AuditChain(lastHash);

  const payload = {
    tenderId,
    status: "SEALED",
    timestamp: new Date().toISOString(),
  };

  const { eventHash, prevHash } = chain.append("TENDER_SEALED", payload);

  await prisma.auditLog.create({
    data: {
      tenderId,
      prevHash,
      eventType: "TENDER_SEALED",
      payload,
      eventHash,
    },
  });

  // Trigger webhook
  try {
    const wq = await getWebhookQueue();
    await wq.add("deliver", { eventType: "tender.sealed", tenderId });
  } catch (err) {
    console.error("Failed to queue tender.sealed webhook:", err);
  }

  const q = await getQueue();
  const delay = process.env.NODE_ENV === "test" ? 50 : 60000;
  await q.add(
    "reveal-tender",
    { tenderId },
    {
      delay,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  );
}

/**
 * Job: 'reveal-tender'
 * Logic:
 * 1. Transaction: UPDATE Tender SET status='REVEALED' WHERE id=? AND status='SEALED'
 * 2. Compute merkleRoot = real Merkle tree root and save it
 * 3. Create AuditLog: TENDER_REVEALED, payload={merkleRoot, bidCount}
 */
export async function handleRevealTender(tenderId: string): Promise<void> {
  const updateResult = await prisma.tender.updateMany({
    where: {
      id: tenderId,
      status: "SEALED",
    },
    data: {
      status: "REVEALED",
    },
  });

  if (updateResult.count === 0) {
    return;
  }

  const bids = await prisma.bid.findMany({
    where: { tenderId },
    select: { commitment: true },
  });

  const commitments = bids.map((b: any) => b.commitment);
  const { root: merkleRoot } = buildTenderMerkleTree(commitments);

  await prisma.tender.update({
    where: { id: tenderId },
    data: { merkleRoot },
  });

  const lastAudit = await prisma.auditLog.findFirst({
    where: { tenderId },
    orderBy: { id: "desc" },
  });

  const lastHash = lastAudit?.eventHash;
  const chain = new AuditChain(lastHash);

  const payload = {
    tenderId,
    merkleRoot,
    bidCount: commitments.length,
    timestamp: new Date().toISOString(),
  };

  const { eventHash, prevHash } = chain.append("TENDER_REVEALED", payload);

  await prisma.auditLog.create({
    data: {
      tenderId,
      prevHash,
      eventType: "TENDER_REVEALED",
      payload,
      eventHash,
    },
  });

  // Trigger webhook
  try {
    const wq = await getWebhookQueue();
    await wq.add("deliver", { eventType: "tender.revealed", tenderId });
  } catch (err) {
    console.error("Failed to queue tender.revealed webhook:", err);
  }
}
