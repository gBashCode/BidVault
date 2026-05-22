import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { buildApp } from '../src/app.js';
import { prisma, mockRlsContext, mockDb } from '@sealedbid/db';
import { createCommitment } from '@sealedbid/crypto';

describe('SealedBid API - Gap Fill Endpoints', () => {
  let app: any;
  let request: supertest.SuperTest<supertest.Test>;

  // Use cuid-conformant IDs (start with 'c', alphanumeric, length 25)
  const orgId = 'corggapfill1234567890123';
  const managerId = 'cmgrgapfill1234567890123';
  const vendorId = 'cvndgapfill1234567890123';
  const auditorId = 'caudgapfill1234567890123';

  let managerToken: string;
  let vendorToken: string;
  let auditorToken: string;

  let tenderId: string;
  let bidId: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
    request = supertest(app.server);

    managerToken = app.jwt.sign({ id: managerId, orgId, role: 'PROCUREMENT_MANAGER' });
    vendorToken = app.jwt.sign({ id: vendorId, orgId, role: 'VENDOR' });
    auditorToken = app.jwt.sign({ id: auditorId, orgId, role: 'AUDITOR' });

    // Clear RLS for seeding
    if (mockRlsContext) {
      mockRlsContext.currentUserId = null;
      mockRlsContext.currentOrgId = null;
    }

    try {
      await prisma.org.create({ data: { id: orgId, name: 'Gap Fill Test Org', type: 'ENTERPRISE' } }).catch(() => {});
      await prisma.user.create({ data: { id: managerId, orgId, email: 'mgr@gapfill.com', role: 'PROCUREMENT_MANAGER' } }).catch(() => {});
      await prisma.user.create({ data: { id: vendorId, orgId, email: 'vendor@gapfill.com', role: 'VENDOR' } }).catch(() => {});
      await prisma.user.create({ data: { id: auditorId, orgId, email: 'auditor@gapfill.com', role: 'AUDITOR' } }).catch(() => {});
    } catch (e) {
      console.log('🧪 Gap-fill test seeding skipped.');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Setup: Create tender + submit bid ──────────────────────────────────────

  it('should create a tender and submit a bid for subsequent tests', async () => {
    const now = Date.now();
    // Long deadline so we can test withdrawal before deadline
    const submissionDeadline = new Date(now + 60_000).toISOString();
    const revealTime = new Date(now + 120_000).toISOString();

    const createRes = await request
      .post('/v1/tenders')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        title: 'Gap Fill Test Tender',
        description: 'Testing gap-fill endpoints.',
        submissionDeadline,
        revealTime,
      });

    expect(createRes.status).toBe(201);
    tenderId = createRes.body.id;

    // Publish
    const publishRes = await request
      .patch(`/v1/tenders/${tenderId}/publish`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(publishRes.status).toBe(200);

    // Submit bid
    const bidData = { amount: 50000, currency: 'EUR' };
    const salt = 'gap_fill_test_salt_32_chars_long';
    const commitment = createCommitment(bidData, salt);
    const saltHash = createCommitment({ salt }, salt);

    const submitRes = await request
      .post(`/v1/tenders/${tenderId}/bids`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ commitment, saltHash });

    expect(submitRes.status).toBe(201);
    bidId = submitRes.body.id;
    expect(submitRes.body.uploadUrl).toBeDefined();
  });

  // ─── Test: POST /v1/bids/:id/confirm-upload ─────────────────────────────────

  it('should confirm S3 upload for a bid', async () => {
    const res = await request
      .post(`/v1/bids/${bidId}/confirm-upload`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({
        etag: '"abc123def456"',
        s3Key: `tenders/${tenderId}/bids/${bidId}.enc`,
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(bidId);
    expect(res.body.status).toBe('upload_confirmed');
  });

  it('should reject confirm-upload from a different vendor', async () => {
    // Create a second vendor
    const otherVendorId = 'cvnd2gapfill123456789012';
    try {
      await prisma.user.create({ data: { id: otherVendorId, orgId, email: 'vendor2@gapfill.com', role: 'VENDOR' } }).catch(() => {});
    } catch (e) {}
    const otherVendorToken = app.jwt.sign({ id: otherVendorId, orgId, role: 'VENDOR' });

    const res = await request
      .post(`/v1/bids/${bidId}/confirm-upload`)
      .set('Authorization', `Bearer ${otherVendorToken}`)
      .send({
        etag: '"xyz789"',
        s3Key: `tenders/${tenderId}/bids/${bidId}.enc`,
      });

    // RLS hides the bid from other vendors entirely — 404 is the correct
    // secure response (no information leakage about other vendors' bids)
    expect(res.status).toBe(404);
  });

  // ─── Test: PATCH /v1/bids/:id/withdraw ──────────────────────────────────────

  it('should withdraw a bid before submission deadline', async () => {
    const res = await request
      .patch(`/v1/bids/${bidId}/withdraw`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ reason: 'Changed pricing strategy' });

    expect(res.status).toBe(200);
    expect(res.body.bidId).toBe(bidId);
    expect(res.body.reason).toBe('Changed pricing strategy');
    expect(res.body.withdrawnAt).toBeDefined();
  });

  it('should reject duplicate withdrawal', async () => {
    const res = await request
      .patch(`/v1/bids/${bidId}/withdraw`)
      .set('Authorization', `Bearer ${vendorToken}`)
      .send({ reason: 'Another attempt' });

    expect(res.status).toBe(409);
  });

  // ─── Test: GET /v1/tenders/:id/audit-logs ───────────────────────────────────

  it('should return audit logs for a tender (manager)', async () => {
    const res = await request
      .get(`/v1/tenders/${tenderId}/audit-logs`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // Manager should see payload
    const submitLog = res.body.find((l: any) => l.eventType === 'BID_SUBMITTED');
    if (submitLog) {
      expect(submitLog.payload).toBeDefined();
    }
  });

  it('should filter audit logs for vendor (own events only)', async () => {
    const res = await request
      .get(`/v1/tenders/${tenderId}/audit-logs`)
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Vendor should only see events where actorId is their own
    for (const log of res.body) {
      expect(log.actorId).toBe(vendorId);
      // Vendor should NOT see payload
      expect(log.payload).toBeUndefined();
    }
  });

  // ─── Test: GET /v1/tenders/:id/documents ────────────────────────────────────

  it('should return documents for a tender (empty initially)', async () => {
    const res = await request
      .get(`/v1/tenders/${tenderId}/documents`)
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  // ─── Test: GET /v1/public/tenders ───────────────────────────────────────────

  it('should return public tenders (only revealed/awarded)', async () => {
    // Our tender is still OPEN, so it should not appear
    const res = await request.get('/v1/public/tenders');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // None of our test tenders should appear since they are not REVEALED
    const found = res.body.find((t: any) => t.id === tenderId);
    expect(found).toBeUndefined();
  });

  // ─── Test: GET /v1/org/:orgId/vendors ───────────────────────────────────────

  it('should return vendors for the org', async () => {
    const res = await request
      .get(`/v1/org/${orgId}/vendors`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    // Should contain our vendor
    const vendor = res.body.find((v: any) => v.id === vendorId);
    expect(vendor).toBeDefined();
    expect(vendor.role).toBe('VENDOR');
  });

  it('should reject vendor list request from wrong org', async () => {
    const otherOrgToken = app.jwt.sign({ id: managerId, orgId: 'cother123456789012345678', role: 'PROCUREMENT_MANAGER' });

    const res = await request
      .get(`/v1/org/${orgId}/vendors`)
      .set('Authorization', `Bearer ${otherOrgToken}`);

    expect(res.status).toBe(403);
  });

  it('should reject vendor list request from VENDOR role', async () => {
    const res = await request
      .get(`/v1/org/${orgId}/vendors`)
      .set('Authorization', `Bearer ${vendorToken}`);

    expect(res.status).toBe(403);
  });
});
