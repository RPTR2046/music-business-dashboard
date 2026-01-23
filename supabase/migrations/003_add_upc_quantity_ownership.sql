-- Add upc, quantity, and ownership_percent columns to transactions table
-- These fields are parsed from CSVs but were not being stored

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS upc VARCHAR(14);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS ownership_percent DECIMAL(5,2);

-- Add index for UPC lookups
CREATE INDEX IF NOT EXISTS idx_transactions_upc ON transactions(upc) WHERE upc IS NOT NULL;
