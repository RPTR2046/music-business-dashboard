-- Add royalty type categorization to transactions table
-- This distinguishes between different income streams:
-- - income_type: master (recording) vs publishing (songwriter)
-- - royalty_type: recording, performance, mechanical, sync

-- Income type: Which rights the income is derived from
-- 'master' = Recording/master rights (artist share from streaming, sales, etc.)
-- 'publishing' = Publishing/songwriting rights (writer share from performances, mechanicals)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS income_type VARCHAR(20);

-- Royalty type: Specific type of royalty payment
-- 'recording' = Master recording royalties (streaming, downloads, physical sales)
-- 'performance' = Public performance royalties (radio, TV, live, digital performance)
-- 'mechanical' = Mechanical royalties (reproduction rights - streams, downloads, physical)
-- 'sync' = Synchronization royalties (music in film, TV, ads, games)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS royalty_type VARCHAR(20);

-- Add indexes for filtering by income/royalty type
CREATE INDEX IF NOT EXISTS idx_transactions_income_type ON transactions(income_type) WHERE income_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_royalty_type ON transactions(royalty_type) WHERE royalty_type IS NOT NULL;

-- Add check constraints for valid values
ALTER TABLE transactions ADD CONSTRAINT valid_income_type
  CHECK (income_type IS NULL OR income_type IN ('master', 'publishing'));

ALTER TABLE transactions ADD CONSTRAINT valid_royalty_type
  CHECK (royalty_type IS NULL OR royalty_type IN ('recording', 'performance', 'mechanical', 'sync'));

-- Comment explaining the categorization
COMMENT ON COLUMN transactions.income_type IS 'master = recording rights income, publishing = songwriting rights income';
COMMENT ON COLUMN transactions.royalty_type IS 'recording, performance, mechanical, or sync royalties';
