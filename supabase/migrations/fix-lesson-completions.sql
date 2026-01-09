-- Fix Lesson Completions - Migration
-- Run this in Supabase SQL Editor
-- This creates a proper table for tracking lesson completions by slug

-- Create new table for tracking lesson completions by slug
CREATE TABLE IF NOT EXISTS public.user_lesson_completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content_slug TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, content_slug),
  CONSTRAINT valid_completion_status CHECK (status IN ('not_started', 'viewed', 'completed'))
);

-- Enable RLS
ALTER TABLE public.user_lesson_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage own lesson completions"
  ON public.user_lesson_completions FOR ALL
  USING ((SELECT auth.uid()) = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON public.user_lesson_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_slug ON public.user_lesson_completions(content_slug);
CREATE INDEX IF NOT EXISTS idx_lesson_completions_status ON public.user_lesson_completions(user_id, status);

-- Grant permissions
GRANT ALL ON public.user_lesson_completions TO authenticated;
