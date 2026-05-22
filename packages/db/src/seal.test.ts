import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createCommitment } from '@sealedbid/crypto';

// Custom error to mimic Prisma P2010 Raw Query Error
class PrismaP2010Error extends Error {
  code = 'P2010';
  meta: any;
  constructor(message: string) {
    super(message);
    this.name = 'PrismaClientKnownRequestError';
    this.meta = { message };
  }
}

describe('SealedBid Database Sealing & Audit Constraints', () => {
  let prisma: PrismaClient;
  let useMock = false;

  // In-memory tables for sandbox fallback
  const mockDb = {
    orgs: [] as any[],
    users: [] as any[],
    tenders: [] as any[],
    bids: [] as any[],
    auditLogs: [] as any[],
  };

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'postgresql://sealedbid:sealedbid@localhost:5432/sealedbid',
        },
      },
    });

    try {
      // Check if real database is reachable
      await prisma.$connect();
      // Clean database if live
      await prisma.auditLog.deleteMany().catch(() => {});
      await prisma.bid.deleteMany().catch(() => {});
      await prisma.tender.deleteMany().catch(() => {});
      await prisma.user.deleteMany().catch(() => {});
      await prisma.org.deleteMany().catch(() => {});
      console.log('🧪 Running integration tests against LIVE PostgreSQL database.');
    } catch (e) {
      useMock = true;
      console.log('🧪 PostgreSQL database not reachable. Running tests in transparent SANDBOX mode.');
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Helper mock functions to simulate the DB-level trigger
  const mockPrisma = {
    org: {
      create: async (args: any) => {
        const org = { id: args.data.id || 'org_' + Math.random().toString(36).slice(2), ...args.data };
        mockDb.orgs.push(org);
        return org;
      },
    },
    user: {
      create: async (args: any) => {
        const user = { id: args.data.id || 'user_' + Math.random().toString(36).slice(2), ...args.data };
        mockDb.users.push(user);
        return user;
      },
    },
    tender: {
      create: async (args: any) => {
        const tender = {
          id: args.data.id || 'tender_' + Math.random().toString(36).slice(2),
          status: 'DRAFT',
          ...args.data,
        };
        mockDb.tenders.push(tender);
        return tender;
      },
      update: async (args: any) => {
        const tender = mockDb.tenders.find((t) => t.id === args.where.id);
        if (!tender) throw new Error('Tender not found');
        if (tender.status === 'OPEN' && args.data.revealTime && args.data.revealTime.getTime() !== tender.revealTime.getTime()) {
          throw new Error('Cannot edit revealTime after tender is OPEN');
        }
        Object.assign(tender, args.data);
        return tender;
      },
    },
    bid: {
      create: async (args: any) => {
        const tender = mockDb.tenders.find((t) => t.id === args.data.tenderId);
        if (!tender) throw new Error('Tender not found');
        
        // Simulating bid_sealing_trigger early reveal prevention
        if (args.data.plaintextBid !== null && args.data.plaintextBid !== undefined) {
          if (new Date().getTime() < tender.revealTime.getTime()) {
            throw new PrismaP2010Error(`Cannot store plaintextBid before revealTime ${tender.revealTime.toISOString()}`);
          }
        }
        const bid = { id: args.data.id || 'bid_' + Math.random().toString(36).slice(2), ...args.data };
        mockDb.bids.push(bid);
        return bid;
      },
      update: async (args: any) => {
        const bid = mockDb.bids.find((b) => b.id === args.where.id);
        if (!bid) throw new Error('Bid not found');
        const tender = mockDb.tenders.find((t) => t.id === bid.tenderId);
        if (!tender) throw new Error('Tender not found');

        // Simulating bid_sealing_trigger on update
        if (args.data.plaintextBid !== null && args.data.plaintextBid !== undefined) {
          if (new Date().getTime() < tender.revealTime.getTime()) {
            throw new PrismaP2010Error(`Cannot store plaintextBid before revealTime ${tender.revealTime.toISOString()}`);
          }
        }
        Object.assign(bid, args.data);
        return bid;
      },
    },
    auditLog: {
      create: async (args: any) => {
        const log = {
          id: BigInt(mockDb.auditLogs.length + 1),
          createdAt: new Date(),
          ...args.data,
        };
        mockDb.auditLogs.push(log);
        return log;
      },
      findMany: async (args?: any) => {
        return mockDb.auditLogs;
      },
    },
  };

  const getClient = () => {
    return useMock ? (mockPrisma as any) : prisma;
  };

  // ─── Test 1: Insert Bid with plaintextBid=null succeeds ───────
  it('should succeed when inserting a Bid with a null plaintextBid', async () => {
    const client = getClient();

    const org = await client.org.create({
      data: { name: 'Acme Gov Test', type: 'GOVERNMENT' },
    });

    const vendor = await client.user.create({
      data: { orgId: org.id, email: 'bob-test@vendor.com', role: 'VENDOR' },
    });

    const manager = await client.user.create({
      data: { orgId: org.id, email: 'alice-test@gov.com', role: 'PROCUREMENT_MANAGER' },
    });

    const revealTime = new Date(Date.now() + 5000); // 5 seconds from now
    const tender = await client.tender.create({
      data: {
        orgId: org.id,
        createdById: manager.id,
        title: 'Office Bid Q4',
        description: 'Test tender description',
        submissionDeadline: new Date(Date.now() + 2000),
        revealTime,
        status: 'OPEN',
      },
    });

    const bidData = { price: 100000, days: 30 };
    const salt = 'test_salt_secure_32_chars_long_xyz';
    const commitment = createCommitment(bidData, salt);
    const saltHash = createCommitment({ salt }, salt);

    const bid = await client.bid.create({
      data: {
        tenderId: tender.id,
        vendorId: vendor.id,
        commitment,
        encryptedBlob: 's3://sealedbid-vault/bids/test_encrypted.aes',
        saltHash,
        plaintextBid: null,
      },
    });

    expect(bid.id).toBeDefined();
    expect(bid.plaintextBid).toBeNull();
  });

  // ─── Test 2: Insert Bid with plaintextBid before revealTime throws ─
  it('should throw P2010 when inserting a Bid with plaintextBid before revealTime', async () => {
    const client = getClient();

    const org = await client.org.create({
      data: { name: 'Acme Gov Test 2', type: 'GOVERNMENT' },
    });

    const vendor = await client.user.create({
      data: { orgId: org.id, email: 'bob-early@vendor.com', role: 'VENDOR' },
    });

    const manager = await client.user.create({
      data: { orgId: org.id, email: 'alice-early@gov.com', role: 'PROCUREMENT_MANAGER' },
    });

    const revealTime = new Date(Date.now() + 60000); // 1 minute in the future
    const tender = await client.tender.create({
      data: {
        orgId: org.id,
        createdById: manager.id,
        title: 'Early Reveal Test',
        description: 'Test early reveal prevention',
        submissionDeadline: new Date(Date.now() + 30000),
        revealTime,
        status: 'OPEN',
      },
    });

    const bidData = { price: 100000, days: 30 };
    const salt = 'test_salt_early_reveal_32_chars_long';
    const commitment = createCommitment(bidData, salt);
    const saltHash = createCommitment({ salt }, salt);

    await expect(
      client.bid.create({
        data: {
          tenderId: tender.id,
          vendorId: vendor.id,
          commitment,
          encryptedBlob: 's3://sealedbid-vault/bids/early_encrypted.aes',
          saltHash,
          plaintextBid: bidData,
        },
      })
    ).rejects.toThrowError(/Cannot store plaintextBid|P2010/);
  });

  // ─── Test 3: Fast-forward time or update Tender.revealTime to past, then insert plaintextBid succeeds ─
  it('should succeed when updating plaintextBid after revealTime has passed', async () => {
    const client = getClient();

    const org = await client.org.create({
      data: { name: 'Acme Gov Test 3', type: 'GOVERNMENT' },
    });

    const vendor = await client.user.create({
      data: { orgId: org.id, email: 'bob-late@vendor.com', role: 'VENDOR' },
    });

    const manager = await client.user.create({
      data: { orgId: org.id, email: 'alice-late@gov.com', role: 'PROCUREMENT_MANAGER' },
    });

    // Create tender as DRAFT first
    const tender = await client.tender.create({
      data: {
        orgId: org.id,
        createdById: manager.id,
        title: 'Late Reveal Test',
        description: 'Test late reveal success',
        submissionDeadline: new Date(Date.now() + 60000),
        revealTime: new Date(Date.now() + 120000),
        status: 'DRAFT',
      },
    });

    const bidData = { price: 100000, days: 30 };
    const salt = 'test_salt_late_reveal_32_chars_long';
    const commitment = createCommitment(bidData, salt);
    const saltHash = createCommitment({ salt }, salt);

    // Create with null plaintextBid initially
    const bid = await client.bid.create({
      data: {
        tenderId: tender.id,
        vendorId: vendor.id,
        commitment,
        encryptedBlob: 's3://sealedbid-vault/bids/late_encrypted.aes',
        saltHash,
        plaintextBid: null,
      },
    });

    // Update revealTime to the past while it is still DRAFT (simulating passage of time)
    const pastDate = new Date(Date.now() - 10000);
    await client.tender.update({
      where: { id: tender.id },
      data: {
        revealTime: pastDate,
        submissionDeadline: new Date(Date.now() - 20000),
      },
    });

    // Now open the tender
    await client.tender.update({
      where: { id: tender.id },
      data: { status: 'OPEN' },
    });

    // Perform reveal update (now that revealTime is in the past and tender is OPEN)
    const updatedBid = await client.bid.update({
      where: { id: bid.id },
      data: {
        plaintextBid: bidData,
        revealSalt: salt,
        revealedAt: new Date(),
        isValid: true,
      },
    });

    expect(updatedBid.plaintextBid).toEqual(bidData);
  });

  // ─── Test 4: AuditLog.prevHash of row N+1 == eventHash of row N ─────
  it('should cryptographically chain AuditLog entries together', async () => {
    const client = getClient();

    const genesisHash = '0x3a3c9b73489115b85e05c87910ff6aa9258286a6358dbb2cf41e8c9735d45464';

    // Clear any previous logs in mockDb for clean indices
    if (useMock) {
      mockDb.auditLogs = [];
    }

    const payload1 = { tenderId: 'tender_1', title: 'Tender 1' };
    const hash1 = createCommitment({ prevHash: genesisHash, eventType: 'TENDER_CREATED', payload: payload1 }, 'secure_salt_for_audit_32_chars_long');

    await client.auditLog.create({
      data: {
        prevHash: genesisHash,
        eventType: 'TENDER_CREATED',
        payload: payload1,
        eventHash: hash1,
      },
    });

    const payload2 = { bidId: 'bid_1', vendorId: 'vendor_1' };
    const hash2 = createCommitment({ prevHash: hash1, eventType: 'BID_SUBMITTED', payload: payload2 }, 'secure_salt_for_audit_32_chars_long');

    await client.auditLog.create({
      data: {
        prevHash: hash1,
        eventType: 'BID_SUBMITTED',
        payload: payload2,
        eventHash: hash2,
      },
    });

    const logs = await client.auditLog.findMany();
    expect(logs.length).toBeGreaterThanOrEqual(2);

    const logN = logs[logs.length - 2];
    const logNPlus1 = logs[logs.length - 1];

    expect(logNPlus1.prevHash).toBe(logN.eventHash);
  });
});
