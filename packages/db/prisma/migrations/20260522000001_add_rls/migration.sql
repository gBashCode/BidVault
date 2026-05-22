-- Enable Row Level Security
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tender" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Bid" ENABLE ROW LEVEL SECURITY;

-- Policy for User: only see users in the same organization
CREATE POLICY user_isolation ON "User" 
USING ("orgId" = current_setting('app.current_org_id', true)::text);

-- Policy for Tender: only see tenders in the same organization
CREATE POLICY tender_isolation ON "Tender"
USING ("orgId" = current_setting('app.current_org_id', true)::text);

-- Policy for Bid (Vendor Read): Vendor can only SELECT their own bids
CREATE POLICY bid_vendor_read ON "Bid" FOR SELECT
USING ("vendorId" = current_setting('app.current_user_id', true)::text);

-- Policy for Bid (Manager Read): Manager/Auditor/OrgAdmin can SELECT all bids submitted to tenders belonging to their own organization
CREATE POLICY bid_manager_read ON "Bid" FOR SELECT
USING (EXISTS (
  SELECT 1 FROM "User" WHERE id = current_setting('app.current_user_id', true)::text 
  AND "orgId" = (SELECT "orgId" FROM "Tender" WHERE id = "Bid"."tenderId")
  AND role IN ('PROCUREMENT_MANAGER', 'AUDITOR', 'ORG_ADMIN')
));
