-- SnusWorld: Fix missing price columns + create prices table
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add missing columns to stores table
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS latest_price     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS latest_can_size  INTEGER DEFAULT 15;

-- 2. Create the prices table (where individual price reports live)
CREATE TABLE IF NOT EXISTS prices (
  id           SERIAL PRIMARY KEY,
  store_id     INT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  price        NUMERIC(10,2) NOT NULL,
  can_size     INTEGER NOT NULL DEFAULT 15,
  reported_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_prices_store_id    ON prices (store_id);
CREATE INDEX IF NOT EXISTS idx_prices_reported_at ON prices (store_id, reported_at DESC);

-- 4. Row-level security
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

-- Anyone can read prices
CREATE POLICY "Read all prices"
  ON prices FOR SELECT
  USING (true);

-- Authenticated users can insert prices
CREATE POLICY "Insert price"
  ON prices FOR INSERT
  WITH CHECK (true);
