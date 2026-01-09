-- Daily Lesson Drip System Tables
-- Run this migration in Supabase SQL Editor

-- ============================================
-- 1. USER LESSON QUEUE TABLE
-- Stores personalized lesson order per user based on weak areas
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_lesson_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content_slug VARCHAR(100) NOT NULL,
  queue_position INTEGER NOT NULL,
  priority_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, content_slug),
  UNIQUE(user_id, queue_position)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_queue_user ON public.user_lesson_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_queue_user_position ON public.user_lesson_queue(user_id, queue_position);

-- RLS policies
ALTER TABLE public.user_lesson_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own queue"
  ON public.user_lesson_queue FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own queue"
  ON public.user_lesson_queue FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage all queues"
  ON public.user_lesson_queue FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 2. USER LESSON UNLOCKS TABLE
-- Tracks which lessons are unlocked for each user
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_lesson_unlocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content_slug VARCHAR(100) NOT NULL,
  unlock_order INTEGER NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, content_slug)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lesson_unlocks_user ON public.user_lesson_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_unlocks_user_order ON public.user_lesson_unlocks(user_id, unlock_order);
CREATE INDEX IF NOT EXISTS idx_lesson_unlocks_unlocked_at ON public.user_lesson_unlocks(unlocked_at);

-- RLS policies
ALTER TABLE public.user_lesson_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks"
  ON public.user_lesson_unlocks FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own unlocks"
  ON public.user_lesson_unlocks FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage all unlocks"
  ON public.user_lesson_unlocks FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- 3. ALTER USERS TABLE
-- Add columns for drip system tracking
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_unlock_date DATE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS signup_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- ============================================
-- 4. UPDATE USER_CONTENT_PROGRESS TABLE (if needed)
-- Ensure we have proper indexes for completion tracking
-- ============================================
CREATE INDEX IF NOT EXISTS idx_content_progress_user_status
  ON public.user_content_progress(user_id, status);

CREATE INDEX IF NOT EXISTS idx_content_progress_user_content
  ON public.user_content_progress(user_id, content_id);
