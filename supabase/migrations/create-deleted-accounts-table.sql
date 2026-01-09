-- Create Deleted Accounts Table
-- Run this in Supabase SQL Editor
-- This table stores archived user data when accounts are deleted

CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  original_user_id UUID NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  location TEXT,
  base_score INTEGER,
  score_band TEXT,
  total_content_completed INTEGER DEFAULT 0,
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  signup_completed_at TIMESTAMP WITH TIME ZONE,
  original_created_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deletion_reason TEXT,

  -- Store additional data as JSON for flexibility
  user_data JSONB,
  test_responses JSONB,
  weak_areas JSONB
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON public.deleted_accounts(email);
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_deleted_at ON public.deleted_accounts(deleted_at);

-- RLS - Only service role can access this table
ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

-- No public access - only accessible via service role (edge functions)
-- This keeps deleted user data private and secure
