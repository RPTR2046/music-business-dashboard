-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- SONGS TABLE
-- Stores song catalog with metadata
-- =====================================================
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  title TEXT NOT NULL,
  artist_name TEXT,
  release_date DATE,

  -- Identifiers
  isrc VARCHAR(12), -- Format: CC-XXX-YY-NNNNN
  iswc VARCHAR(15), -- Format: T-XXXXXXXXX-C
  upc VARCHAR(12),  -- 12 digits

  -- Release Info
  release_title TEXT,
  distributor TEXT,

  -- Ownership Percentages
  master_ownership_percent DECIMAL(5,2) CHECK (master_ownership_percent >= 0 AND master_ownership_percent <= 100),
  publishing_ownership_percent DECIMAL(5,2) CHECK (publishing_ownership_percent >= 0 AND publishing_ownership_percent <= 100),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  UNIQUE(user_id, isrc)
);

-- Index for faster lookups
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_isrc ON songs(isrc) WHERE isrc IS NOT NULL;
CREATE INDEX idx_songs_title ON songs(title);

-- =====================================================
-- CONTRIBUTORS TABLE
-- Stores writers, producers, artists
-- =====================================================
CREATE TABLE contributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Contributor Info
  legal_name TEXT NOT NULL,
  pro_affiliation VARCHAR(20), -- BMI, ASCAP, SESAC, etc.
  ipi_cae_number VARCHAR(11),   -- 9-11 digits

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate contributors per user
  UNIQUE(user_id, legal_name, ipi_cae_number)
);

CREATE INDEX idx_contributors_user_id ON contributors(user_id);

-- =====================================================
-- SONG_CONTRIBUTORS TABLE
-- Junction table linking songs to contributors with splits
-- =====================================================
CREATE TABLE song_contributors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  contributor_id UUID NOT NULL REFERENCES contributors(id) ON DELETE CASCADE,

  -- Role and Split
  role VARCHAR(50), -- writer, producer, featured_artist, etc.
  split_percent DECIMAL(5,2) NOT NULL CHECK (split_percent >= 0 AND split_percent <= 100),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate contributor roles per song
  UNIQUE(song_id, contributor_id, role)
);

CREATE INDEX idx_song_contributors_song_id ON song_contributors(song_id);
CREATE INDEX idx_song_contributors_contributor_id ON song_contributors(contributor_id);

-- =====================================================
-- UPLOADS TABLE
-- Tracks CSV upload history
-- =====================================================
CREATE TABLE uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Upload Info
  source VARCHAR(50) NOT NULL, -- distrokid, bmi, ascap, etc.
  original_filename TEXT NOT NULL,
  s3_key TEXT NOT NULL, -- Path to file in S3

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, failed, rolled_back
  transaction_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2),
  currency_code VARCHAR(3) DEFAULT 'USD',

  -- Metadata
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back'))
);

CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_status ON uploads(status);
CREATE INDEX idx_uploads_uploaded_at ON uploads(uploaded_at DESC);

-- =====================================================
-- TRANSACTIONS TABLE
-- Individual royalty transaction records
-- =====================================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL, -- Can be null if not matched yet

  -- Transaction Details
  track_title TEXT NOT NULL,
  platform_source TEXT NOT NULL, -- Spotify, Apple Music, YouTube, etc.
  reporting_period_start DATE NOT NULL, -- Start of reporting period (e.g., 2024-01-01)

  -- Revenue
  amount DECIMAL(12,2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',

  -- Additional Info
  territory VARCHAR(2), -- ISO country code (US, GB, etc.)
  usage_type VARCHAR(50), -- streaming, download, performance, mechanical, etc.

  -- Matching Info
  matched_by VARCHAR(20), -- isrc, title_fuzzy, manual, null if unmatched
  match_confidence DECIMAL(5,2), -- 0-100, used for fuzzy matching

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Composite key for duplicate detection
  UNIQUE(user_id, reporting_period_start, track_title, platform_source, amount, currency_code)
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_upload_id ON transactions(upload_id);
CREATE INDEX idx_transactions_song_id ON transactions(song_id);
CREATE INDEX idx_transactions_reporting_period ON transactions(reporting_period_start DESC);
CREATE INDEX idx_transactions_platform ON transactions(platform_source);

-- =====================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Ensures users can only access their own data
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Songs Policies
CREATE POLICY "Users can view their own songs"
  ON songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);

-- Contributors Policies
CREATE POLICY "Users can view their own contributors"
  ON contributors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contributors"
  ON contributors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contributors"
  ON contributors FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contributors"
  ON contributors FOR DELETE
  USING (auth.uid() = user_id);

-- Song Contributors Policies (based on song ownership)
CREATE POLICY "Users can view song_contributors for their songs"
  ON song_contributors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM songs WHERE songs.id = song_contributors.song_id AND songs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert song_contributors for their songs"
  ON song_contributors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM songs WHERE songs.id = song_contributors.song_id AND songs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update song_contributors for their songs"
  ON song_contributors FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM songs WHERE songs.id = song_contributors.song_id AND songs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete song_contributors for their songs"
  ON song_contributors FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM songs WHERE songs.id = song_contributors.song_id AND songs.user_id = auth.uid()
  ));

-- Uploads Policies
CREATE POLICY "Users can view their own uploads"
  ON uploads FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
  ON uploads FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads"
  ON uploads FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
  ON uploads FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions Policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contributors_updated_at
  BEFORE UPDATE ON contributors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to validate song contributor splits total 100% (with ±0.01% tolerance)
CREATE OR REPLACE FUNCTION validate_contributor_splits()
RETURNS TRIGGER AS $$
DECLARE
  total_split DECIMAL(5,2);
BEGIN
  -- Calculate total split for this song
  SELECT COALESCE(SUM(split_percent), 0)
  INTO total_split
  FROM song_contributors
  WHERE song_id = NEW.song_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID);

  total_split := total_split + NEW.split_percent;

  -- Allow ±0.01% tolerance for rounding errors
  IF total_split < 99.99 OR total_split > 100.01 THEN
    RAISE EXCEPTION 'Total contributor splits must equal 100 percent (±0.01 percent). Current total: %', total_split;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_splits_before_insert
  BEFORE INSERT ON song_contributors
  FOR EACH ROW
  EXECUTE FUNCTION validate_contributor_splits();

CREATE TRIGGER validate_splits_before_update
  BEFORE UPDATE ON song_contributors
  FOR EACH ROW
  EXECUTE FUNCTION validate_contributor_splits();
