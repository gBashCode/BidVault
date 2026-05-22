-- ─── Prevent early reveal trigger ────────────────────────────
-- This trigger function enforces that plaintextBid, revealSalt, and revealedAt
-- can ONLY be inserted or updated if NOW() >= Tender.revealTime.
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

-- ─── Check Constraint for Tender ──────────────────────────────
-- Enforces that submissionDeadline is less than or equal to revealTime
ALTER TABLE "Tender"
ADD CONSTRAINT "Tender_deadline_before_reveal"
CHECK ("submissionDeadline" <= "revealTime");

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
