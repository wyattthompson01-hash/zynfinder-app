-- SnusWorld: Marketplace listings table
-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  brand         TEXT NOT NULL DEFAULT 'zyn',
  flavor        TEXT,
  strength      TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  price_per_can NUMERIC(10,2) NOT NULL,
  total_price   NUMERIC(10,2) NOT NULL,
  description   TEXT,
  condition     TEXT NOT NULL DEFAULT 'new',
  location_text TEXT,
  lat           NUMERIC(10,6),
  lng           NUMERIC(10,6),
  pickup        BOOLEAN NOT NULL DEFAULT true,
  shipping      BOOLEAN NOT NULL DEFAULT false,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
);

-- Row-level security
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can read active listings
CREATE POLICY "Read active listings"
  ON marketplace_listings FOR SELECT
  USING (is_active = true);

-- Authenticated users can create listings
CREATE POLICY "Create own listing"
  ON marketplace_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update/delete their own listings
CREATE POLICY "Manage own listings"
  ON marketplace_listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Delete own listings"
  ON marketplace_listings FOR DELETE
  USING (auth.uid() = user_id);

-- Index for geo queries
CREATE INDEX IF NOT EXISTS marketplace_listings_location
  ON marketplace_listings (lat, lng)
  WHERE is_active = true;

-- Index for user's listings
CREATE INDEX IF NOT EXISTS marketplace_listings_user
  ON marketplace_listings (user_id, created_at DESC);
