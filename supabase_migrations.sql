-- ── ZynFinder Supabase Migrations ──
-- Run these in your Supabase SQL editor (Dashboard → SQL editor → New query)

-- ── Task 2: User Profiles ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  points INT DEFAULT 0,
  reports_count INT DEFAULT 0,
  verifications_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow users to read all profiles (for leaderboard)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ── Task 3: Prices + stores columns ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prices (
  id SERIAL PRIMARY KEY,
  store_id INT REFERENCES stores(id) ON DELETE CASCADE,
  price DECIMAL(6,2) NOT NULL,
  can_size INT DEFAULT 15,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Prices are viewable by everyone" ON prices
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert prices" ON prices
  FOR INSERT WITH CHECK (true);

-- Add denormalized price columns to stores for fast list display
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS latest_price DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS latest_can_size INT DEFAULT 15;
