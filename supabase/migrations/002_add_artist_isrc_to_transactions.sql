-- Add artist_name and isrc columns to transactions table
-- These were previously only available at import time but not stored

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS artist_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS isrc VARCHAR(12);

-- Add index for ISRC lookups (for matching to songs)
CREATE INDEX IF NOT EXISTS idx_transactions_isrc ON transactions(isrc) WHERE isrc IS NOT NULL;

-- Add index for artist name searches
CREATE INDEX IF NOT EXISTS idx_transactions_artist_name ON transactions(artist_name) WHERE artist_name IS NOT NULL;
