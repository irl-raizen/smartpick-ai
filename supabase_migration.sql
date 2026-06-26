-- Migration: Add missing specs, metadata, and analytics columns to the phones table, and create sync_logs & analytics_events tables.
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/eujxuoexexbzgqstnfft/sql/new)

-- 1. Add missing columns to phones table
ALTER TABLE phones ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS amazon_link TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS flipkart_link TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS image_source TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS processor TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS ram TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS storage TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS rating NUMERIC;
ALTER TABLE phones ADD COLUMN IF NOT EXISTS launch_year INTEGER;

-- 2. Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_phones_slug ON phones(slug);

-- 3. Create sync_logs table for monitoring scraper activity
CREATE TABLE IF NOT EXISTS sync_logs (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  phones_processed INTEGER DEFAULT 0,
  phones_inserted INTEGER DEFAULT 0,
  phones_updated INTEGER DEFAULT 0,
  phones_marked_inactive INTEGER DEFAULT 0,
  images_updated INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT
);

-- Indexes for performance and sorting on sync_logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_source ON sync_logs(source);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);

-- 4. Create analytics_events table for tracking visitor interactions, search terms, and recommendations
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'page_view', 'search', 'recommendation'
  event_data JSONB NOT NULL,       -- details: { slug, brand }, { query }, { budget }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance and sorting on analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);
