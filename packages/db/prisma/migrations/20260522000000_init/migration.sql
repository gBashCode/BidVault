-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('ENTERPRISE', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "TenderStatus" AS ENUM ('DRAFT', 'OPEN', 'SEALED', 'REVEALED', 'CANCELLED', 'AWARDED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ORG_ADMIN', 'PROCUREMENT_MANAGER', 'AUDITOR', 'VENDOR');

-- CreateTable
CREATE TABLE "Org" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Org_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "revealTime" TIMESTAMP(3) NOT NULL,
    "status" "TenderStatus" NOT NULL DEFAULT 'DRAFT',
    "merkleRoot" TEXT,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "tenderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "commitment" TEXT NOT NULL,
    "encryptedBlob" TEXT NOT NULL,
    "saltHash" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plaintextBid" JSONB,
    "revealSalt" TEXT,
    "revealedAt" TIMESTAMP(3),
    "isValid" BOOLEAN,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "tenderId" TEXT,
    "prevHash" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "payload" JSONB NOT NULL,
    "eventHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Org_type_idx" ON "Org"("type");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_role_idx" ON "User"("orgId", "role");

-- CreateIndex
CREATE INDEX "Tender_orgId_status_idx" ON "Tender"("orgId", "status");

-- CreateIndex
CREATE INDEX "Tender_revealTime_status_idx" ON "Tender"("revealTime", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_tenderId_vendorId_key" ON "Bid"("tenderId", "vendorId");

-- CreateIndex
CREATE INDEX "Bid_tenderId_idx" ON "Bid"("tenderId");

-- CreateIndex
CREATE INDEX "AuditLog_tenderId_createdAt_idx" ON "AuditLog"("tenderId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_eventHash_idx" ON "AuditLog"("eventHash");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tender" ADD CONSTRAINT "Tender_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenderId_fkey" FOREIGN KEY ("tenderId") REFERENCES "Tender"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Check Constraint for Tender ──────────────────────────────
ALTER TABLE "Tender"
ADD CONSTRAINT "Tender_deadline_before_reveal"
CHECK ("submissionDeadline" <= "revealTime");

-- ─── Prevent early reveal trigger ────────────────────────────
CREATE OR REPLACE FUNCTION prevent_early_reveal() RETURNS TRIGGER AS $$
DECLARE
  v_reveal_time TIMESTAMPTZ;
BEGIN
  SELECT "revealTime" INTO v_reveal_time FROM "Tender" WHERE id = NEW."tenderId";
  IF NEW."plaintextBid" IS NOT NULL AND NOW() < v_reveal_time THEN
    RAISE EXCEPTION 'Cannot store plaintextBid before revealTime %', v_reveal_time;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bid_sealing_trigger
BEFORE INSERT OR UPDATE ON "Bid"
FOR EACH ROW EXECUTE FUNCTION prevent_early_reveal();

-- ─── Prevent revealTime modification when status is OPEN ─────
CREATE OR REPLACE FUNCTION prevent_reveal_time_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'OPEN' AND NEW."revealTime" IS DISTINCT FROM OLD."revealTime" THEN
    RAISE EXCEPTION 'Cannot edit revealTime after tender is OPEN';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tender_reveal_time_guard
BEFORE UPDATE ON "Tender"
FOR EACH ROW EXECUTE FUNCTION prevent_reveal_time_change();

-- ─── Make AuditLog append-only (prevent UPDATE/DELETE) ───────
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only. UPDATE and DELETE are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
BEFORE UPDATE OR DELETE ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
