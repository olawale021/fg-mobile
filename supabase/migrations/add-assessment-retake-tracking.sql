-- Migration: Add Assessment Retake Tracking
-- Tracks when users retake the assessment and stores comparison data

-- Add retake tracking columns to test_responses
ALTER TABLE public.test_responses
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_retake BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS previous_score INTEGER,
ADD COLUMN IF NOT EXISTS previous_score_band TEXT,
ADD COLUMN IF NOT EXISTS score_change INTEGER,
ADD COLUMN IF NOT EXISTS lessons_completed_at_assessment INTEGER DEFAULT 0,
-- Store previous answers for comparison
ADD COLUMN IF NOT EXISTS prev_q1 TEXT,
ADD COLUMN IF NOT EXISTS prev_q2 TEXT,
ADD COLUMN IF NOT EXISTS prev_q3 TEXT,
ADD COLUMN IF NOT EXISTS prev_q4 TEXT,
ADD COLUMN IF NOT EXISTS prev_q5 TEXT,
ADD COLUMN IF NOT EXISTS prev_q6 TEXT,
ADD COLUMN IF NOT EXISTS prev_q7 TEXT,
ADD COLUMN IF NOT EXISTS prev_q8 TEXT,
ADD COLUMN IF NOT EXISTS prev_q9 TEXT,
ADD COLUMN IF NOT EXISTS prev_q10 TEXT;

-- Index for efficient user history lookups
CREATE INDEX IF NOT EXISTS idx_test_responses_user_created
ON public.test_responses(user_id, created_at DESC);

-- Add latest assessment tracking to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS latest_score INTEGER,
ADD COLUMN IF NOT EXISTS latest_score_band TEXT,
ADD COLUMN IF NOT EXISTS assessment_count INTEGER DEFAULT 1;
