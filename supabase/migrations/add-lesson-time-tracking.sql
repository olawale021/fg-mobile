-- Add Lesson Time Tracking - Migration
-- Run this in Supabase SQL Editor
-- Adds time tracking and revisit count columns to user_lesson_completions

-- Add time tracking columns
ALTER TABLE public.user_lesson_completions
ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE;

-- Index for admin queries on time data
CREATE INDEX IF NOT EXISTS idx_lesson_completions_time
ON public.user_lesson_completions(user_id, time_spent_seconds);

-- RPC function to save lesson time (accumulates time spent)
CREATE OR REPLACE FUNCTION public.save_lesson_time(
  p_user_id UUID,
  p_content_slug TEXT,
  p_time_seconds INTEGER
)
RETURNS void AS $$
BEGIN
  -- Upsert: create record if doesn't exist, or update existing
  INSERT INTO public.user_lesson_completions (user_id, content_slug, status, time_spent_seconds, read_count, last_read_at)
  VALUES (p_user_id, p_content_slug, 'viewed', p_time_seconds, 1, NOW())
  ON CONFLICT (user_id, content_slug)
  DO UPDATE SET
    time_spent_seconds = user_lesson_completions.time_spent_seconds + p_time_seconds,
    last_read_at = NOW();

  -- Update total learning minutes in users table
  UPDATE public.users
  SET total_learning_minutes = (
    SELECT COALESCE(SUM(time_spent_seconds) / 60, 0)
    FROM public.user_lesson_completions
    WHERE user_id = p_user_id
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to increment read count (called when revisiting completed lesson)
CREATE OR REPLACE FUNCTION public.increment_lesson_read_count(
  p_user_id UUID,
  p_content_slug TEXT
)
RETURNS void AS $$
BEGIN
  UPDATE public.user_lesson_completions
  SET read_count = COALESCE(read_count, 1) + 1,
      last_read_at = NOW()
  WHERE user_id = p_user_id
    AND content_slug = p_content_slug
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.save_lesson_time TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_lesson_read_count TO authenticated;
