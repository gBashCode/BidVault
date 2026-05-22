-- Migration: 20260522000003_gap_fill
-- Adds TenderDocument (vendor document downloads) and BidWithdrawal tables.
-- Applies RLS policies consistent with Phase 6 patterns.

-- ─── TenderDocument ───────────────────────────────────────────────────────────

CREATE TABLE "TenderDocument" (
    "id"           TEXT         NOT NULL,
    "tenderId"     TEXT         NOT NULL,
    "filename"     TEXT         NOT NULL,
    "s3Key"        TEXT         NOT NULL,
    "fileSize"     INTEGER      NOT NULL,
    "uploadedById" TEXT         NOT NULL,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenderDocument_pkey" PRIMARY KEY ("id")
);

-- Index for fast lookup by tender
CREATE INDEX "TenderDocument_tenderId_idx" ON "TenderDocument"("tenderId");

-- FK: TenderDocument → Tender (cascade delete)
ALTER TABLE "TenderDocument"
    ADD CONSTRAINT "TenderDocument_tenderId_fkey"
    FOREIGN KEY ("tenderId") REFERENCES "Tender"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: only members of the same org can see documents for that tender
ALTER TABLE "TenderDocument" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenderdocument_org_isolation ON "TenderDocument"
USING (EXISTS (
    SELECT 1 FROM "Tender"
    WHERE "Tender"."id" = "TenderDocument"."tenderId"
      AND "Tender"."orgId" = current_setting('app.current_org_id', true)::text
));

-- ─── BidWithdrawal ────────────────────────────────────────────────────────────

CREATE TABLE "BidWithdrawal" (
    "id"          TEXT         NOT NULL,
    "bidId"       TEXT         NOT NULL,
    "reason"      TEXT,
    "withdrawnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BidWithdrawal_pkey" PRIMARY KEY ("id")
);

-- Unique: one withdrawal record per bid
CREATE UNIQUE INDEX "BidWithdrawal_bidId_key" ON "BidWithdrawal"("bidId");

-- FK: BidWithdrawal → Bid (cascade delete)
ALTER TABLE "BidWithdrawal"
    ADD CONSTRAINT "BidWithdrawal_bidId_fkey"
    FOREIGN KEY ("bidId") REFERENCES "Bid"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: vendor can only see their own withdrawal records; manager can see all within their org
ALTER TABLE "BidWithdrawal" ENABLE ROW LEVEL SECURITY;

CREATE POLICY bidwithdrawal_vendor_read ON "BidWithdrawal" FOR SELECT
USING (EXISTS (
    SELECT 1 FROM "Bid"
    WHERE "Bid"."id" = "BidWithdrawal"."bidId"
      AND "Bid"."vendorId" = current_setting('app.current_user_id', true)::text
));

CREATE POLICY bidwithdrawal_manager_read ON "BidWithdrawal" FOR SELECT
USING (EXISTS (
    SELECT 1 FROM "User"
    WHERE "User"."id" = current_setting('app.current_user_id', true)::text
      AND "User"."role" IN ('PROCUREMENT_MANAGER', 'AUDITOR', 'ORG_ADMIN')
      AND "User"."orgId" = (
          SELECT "Tender"."orgId"
          FROM "Bid"
          INNER JOIN "Tender" ON "Tender"."id" = "Bid"."tenderId"
          WHERE "Bid"."id" = "BidWithdrawal"."bidId"
      )
));
