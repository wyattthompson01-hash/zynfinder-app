-- SnusWorld: Photo support migration
-- Run this in Supabase Dashboard -> SQL Editor

-- 1. Add photo_url column to marketplace_listings
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Create storage buckets (run in Supabase Dashboard -> Storage)
-- Create bucket named: store-photos (public: true)
-- Create bucket named: listing-photos (public: true)

-- 3. Storage policies for store-photos (allow anyone to read, authenticated to upload)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('store-photos', 'store-photos', true, 5242880)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('listing-photos', 'listing-photos', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read public photos
CREATE POLICY IF NOT EXISTS "Public read store-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'store-photos');

CREATE POLICY IF NOT EXISTS "Public read listing-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-photos');

-- Allow authenticated users to upload
CREATE POLICY IF NOT EXISTS "Auth upload store-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'store-photos' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Auth upload listing-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'listing-photos' AND auth.role() = 'authenticated');
