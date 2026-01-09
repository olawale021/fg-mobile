-- Score Progression System Migration
-- Run this in Supabase SQL Editor

-- Add field to track last lesson completion date
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_lesson_completed_date DATE;

-- Create RPC function for atomic score update with streak
CREATE OR REPLACE FUNCTION public.complete_lesson_and_update_score(
  p_user_id UUID,
  p_content_slug TEXT
)
RETURNS TABLE(
  new_score INTEGER,
  points_earned INTEGER,
  streak_bonus INTEGER,
  new_streak INTEGER,
  new_score_band TEXT
) AS $$
DECLARE
  v_completed_count INTEGER;
  v_current_streak INTEGER;
  v_last_completion DATE;
  v_base_points INTEGER;
  v_streak_bonus INTEGER;
  v_total_points INTEGER;
  v_current_score INTEGER;
  v_new_score INTEGER;
  v_new_band TEXT;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get current user state
  SELECT base_score, current_streak_days, last_lesson_completed_date, total_content_completed
  INTO v_current_score, v_current_streak, v_last_completion, v_completed_count
  FROM public.users WHERE id = p_user_id;

  -- Fixed 1 point per lesson
  v_base_points := 1;

  -- Calculate streak (with 1-day grace period)
  IF v_last_completion IS NULL THEN
    -- First lesson ever
    v_current_streak := 1;
  ELSIF v_last_completion = v_today THEN
    -- Already completed today, no change to streak
    NULL;
  ELSIF v_last_completion >= v_today - 2 THEN
    -- Yesterday or 2 days ago (grace period): increment streak
    v_current_streak := v_current_streak + 1;
  ELSE
    -- 3+ days ago: reset to 1 for today
    v_current_streak := 1;
  END IF;

  -- Streak bonus: +1 for every 3 consecutive days
  v_streak_bonus := FLOOR(v_current_streak / 3);

  -- Calculate new score (capped at 100)
  v_total_points := v_base_points + v_streak_bonus;
  v_new_score := LEAST(100, v_current_score + v_total_points);

  -- Determine new score band
  v_new_band := CASE
    WHEN v_new_score <= 40 THEN 'early-stage'
    WHEN v_new_score <= 70 THEN 'developing'
    WHEN v_new_score <= 90 THEN 'strong'
    ELSE 'ready'
  END;

  -- Update user record
  UPDATE public.users SET
    base_score = v_new_score,
    score_band = v_new_band,
    current_streak_days = v_current_streak,
    longest_streak_days = GREATEST(longest_streak_days, v_current_streak),
    total_content_completed = total_content_completed + 1,
    last_lesson_completed_date = v_today,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN QUERY SELECT v_new_score, v_base_points, v_streak_bonus, v_current_streak, v_new_band;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.complete_lesson_and_update_score TO authenticated;
