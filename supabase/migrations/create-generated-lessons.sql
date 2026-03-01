-- Create generated_lessons table for AI-generated personalized lessons
CREATE TABLE IF NOT EXISTS generated_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  estimated_duration_minutes INTEGER NOT NULL DEFAULT 5,
  lesson_number INTEGER NOT NULL,
  content JSONB NOT NULL, -- holds intro, quickBreakdown, rememberThis
  topic_summary TEXT, -- short summary for dedup when generating new lessons
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user gets unique lesson numbers and slugs
  UNIQUE(user_id, lesson_number),
  UNIQUE(user_id, slug)
);

-- Index for fast lookups
CREATE INDEX idx_generated_lessons_user_id ON generated_lessons(user_id);
CREATE INDEX idx_generated_lessons_user_slug ON generated_lessons(user_id, slug);

-- RLS
ALTER TABLE generated_lessons ENABLE ROW LEVEL SECURITY;

-- Users can read their own generated lessons
CREATE POLICY "Users can read own generated lessons"
  ON generated_lessons FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert (edge functions use service role key)
CREATE POLICY "Service role can insert generated lessons"
  ON generated_lessons FOR INSERT
  WITH CHECK (true);
