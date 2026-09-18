-- Add season tracking to requests and spare_parts.
--
-- Support tickets and spare-parts issuance are event-scoped, but the
-- app's schema evolves year to year. Tagging rows with a season lets
-- old rows survive future schema/feature changes and lets the app
-- default views to "this event" without deleting history.
--
-- Existing rows are backfilled from created_at since they predate
-- this column. Bump the DEFAULT below at the start of each new season
-- (and again in schema.sql, for fresh installs).

ALTER TABLE requests ADD COLUMN IF NOT EXISTS season INTEGER;
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS season INTEGER;

UPDATE requests SET season = EXTRACT(YEAR FROM created_at)::INTEGER WHERE season IS NULL;
UPDATE spare_parts SET season = EXTRACT(YEAR FROM created_at)::INTEGER WHERE season IS NULL;

ALTER TABLE requests ALTER COLUMN season SET NOT NULL;
ALTER TABLE requests ALTER COLUMN season SET DEFAULT 2026;
ALTER TABLE spare_parts ALTER COLUMN season SET NOT NULL;
ALTER TABLE spare_parts ALTER COLUMN season SET DEFAULT 2026;

CREATE INDEX IF NOT EXISTS idx_requests_season ON requests(season);
CREATE INDEX IF NOT EXISTS idx_spare_parts_season ON spare_parts(season);
