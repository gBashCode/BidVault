import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { prisma } from '@sealedbid/db';
import { AuditChain } from '@sealedbid/crypto';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';
import {
  setMockNtpOffset,
  setBypassNtpSync,
  assertTimeSync,
} from './lib/time-guard.js';
import {
  handleCheckReveals,
  handleSealTender,
  handleRevealTender,
  computeMerkleRoot,
} from './queues/tender-scheduler.js';
import { initWorker } from './workers/tender.worker.js';

describe('SealedBid Background Worker - Tender Lifecycle Integration Tests', () => {
  const orgId = 'corg123456789012345678901';
  const managerId = 'cusr123456789012345678901';

  beforeAll(async () => {
    // Set to test mode and bypass actual network UDP calls
    process.env.NODE_ENV = 'test';
    setBypassNtpSync(true);

    // Setup seed data in DB if reachable (Prisma client transparently handles Mock Db too)
    try {
      await prisma.org.create({
        data: {
          id: orgId,
          name: 'Worker Test Org',
          type: 'GOVERNMENT',
        },
      }).catch(() => {});

      await prisma.user.create({
        data: {
          id: managerId,
          orgId,
          email: 'worker-mgr@test.com',
          role: 'PROCUREMENT_MANAGER',
        },
      }).catch(() => {});
    } catch (e) {
      console.log('🧪 Seeding skipped in tests (offline fallback active).');
    }
  });

  beforeEach(async () => {
    // Clear state before each test
    setMockNtpOffset(null);
    setBypassNtpSync(true);
    await prisma.bid.deleteMany().catch(() => {});
    await prisma.auditLog.deleteMany().catch(() => {});
    await prisma.tender.deleteMany().catch(() => {});
  });

  // ─── Test 1: Full Automated Transition ──────────────────────────────
  it('should auto-transition tender from OPEN to SEALED to REVEALED after revealTime passes', async () => {
    const worker = await initWorker();

    // Create tender revealTime = now() + 2s
    const tenderId = 'ctnd' + Math.random().toString(36).slice(2, 23);
    const revealTime = new Date(Date.now() + 1500); // 1.5s in future
    const deadline = new Date(Date.now() + 1000);

    await prisma.tender.create({
      data: {
        id: tenderId,
        orgId,
        createdById: managerId,
        title: 'Tactical Hardware',
        description: 'Secure equipment.',
        status: 'OPEN',
        submissionDeadline: deadline,
        revealTime,
      },
    });

    // Submit a bid commitment
    await prisma.bid.create({
      data: {
        id: 'cbid' + Math.random().toString(36).slice(2, 23),
        tenderId,
        vendorId: managerId,
        commitment: '0x' + 'a'.repeat(64),
        encryptedBlob: 'http://s3/bid.enc',
        saltHash: '0x' + 's'.repeat(64),
      },
    });

    // Wait 2.0s for revealTime to pass
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Run check-reveals handler (will find OPEN tender, queue seal-tender, which queues reveal-tender)
    await handleCheckReveals();

    // Wait for the delayed reveal-tender job (delay is 50ms in test environment)
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Assert status=REVEALED, merkleRoot set, and audit logs created
    const tender = await prisma.tender.findUnique({
      where: { id: tenderId },
    });

    expect(tender).toBeDefined();
    expect(tender?.status).toBe('REVEALED');
    expect(tender?.merkleRoot).toBeDefined();
    expect(tender?.merkleRoot?.startsWith('0x')).toBe(true);

    const logs = await prisma.auditLog.findMany({
      where: { tenderId },
    });
    
    // Should have 1 TENDER_SEALED log and 1 TENDER_REVEALED log
    expect(logs.length).toBe(2);
    expect(logs[0].eventType).toBe('TENDER_SEALED');
    expect(logs[1].eventType).toBe('TENDER_REVEALED');

    // Verify hash chain of the audit logs
    const chain = new AuditChain();
    expect(chain.verifyChain(logs as any)).toBe(true);

    await worker.close();
  });

  // ─── Test 2: Idempotence of Jobs ────────────────────────────────────
  it('should be idempotent and not create duplicate audit logs if job runs twice', async () => {
    const tenderId = 'ctnd' + Math.random().toString(36).slice(2, 23);
    const revealTime = new Date(Date.now() - 10000);

    // Create tender with status SEALED manually
    await prisma.tender.create({
      data: {
        id: tenderId,
        orgId,
        createdById: managerId,
        title: 'Already Sealed Tender',
        description: 'Sealed testing.',
        status: 'SEALED',
        submissionDeadline: revealTime,
        revealTime,
      },
    });

    // Create 1 initial AuditLog for SEALED state to simulate previous run
    await prisma.auditLog.create({
      data: {
        tenderId,
        prevHash: '0x' + 'f'.repeat(64),
        eventType: 'TENDER_SEALED',
        payload: { tenderId },
        eventHash: '0x' + 'e'.repeat(64),
      },
    });

    // Try executing seal-tender again
    await handleSealTender(tenderId);

    // Assert that no new AuditLog rows are added
    const logs = await prisma.auditLog.findMany({
      where: { tenderId },
    });
    
    expect(logs.length).toBe(1); // Still exactly 1 log (the simulated one)
  });

  // ─── Test 3: Clock Drift Throws CLOCK_DRIFT_DETECTED ────────────────
  it('should throw CLOCK_DRIFT_DETECTED on boot/check when clock drift is > 5s', async () => {
    // Set simulated clock drift to +10s (10000ms)
    setMockNtpOffset(10000);
    setBypassNtpSync(false);

    // Check assertion
    await expect(assertTimeSync()).rejects.toThrow('CLOCK_DRIFT_DETECTED');

    // Reset offset
    setMockNtpOffset(null);
    setBypassNtpSync(true);
  });

  // ─── Test 4: Merkle Root Computation ────────────────────────────────
  it('should correctly compute merkleRoot = keccak256(sorted commitments) on reveal', async () => {
    const tenderId = 'ctnd' + Math.random().toString(36).slice(2, 23);
    const revealTime = new Date(Date.now() - 5000);

    await prisma.tender.create({
      data: {
        id: tenderId,
        orgId,
        createdById: managerId,
        title: 'Merkle Test',
        description: 'Merkle testing.',
        status: 'SEALED',
        submissionDeadline: revealTime,
        revealTime,
      },
    });

    // Add bids with distinct commitments
    const commitments = [
      '0xcommitment_c',
      '0xcommitment_a',
      '0xcommitment_b',
    ];

    for (let i = 0; i < commitments.length; i++) {
      await prisma.bid.create({
        data: {
          id: `cbid_${i}_` + Math.random().toString(36).slice(2, 10),
          tenderId,
          vendorId: managerId + i,
          commitment: commitments[i],
          encryptedBlob: 'http://s3/file',
          saltHash: '0xhash',
        },
      });
    }

    // Run reveal-tender job
    await handleRevealTender(tenderId);

    // Assert merkleRoot matching keccak256 of sorted commitments
    const updatedTender = await prisma.tender.findUnique({
      where: { id: tenderId },
    });

    const sortedCommitments = [...commitments].sort();
    const concatenated = sortedCommitments.join('');
    const expectedHashBytes = keccak_256(utf8ToBytes(concatenated));
    const expectedMerkleRoot = '0x' + bytesToHex(expectedHashBytes);

    expect(updatedTender?.status).toBe('REVEALED');
    expect(updatedTender?.merkleRoot).toBe(expectedMerkleRoot);
  });
});
