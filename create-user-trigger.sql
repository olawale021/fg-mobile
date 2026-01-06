-- Create a trigger to automatically create user profile when auth user is created
-- This solves the RLS timing issue during signup

-- First, drop the existing insert policy since we won't need manual inserts
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Create a function that will be triggered on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    first_name,
    last_name,
    location,
    base_score,
    score_band,
    preferred_learning_format,
    total_content_completed,
    total_learning_minutes,
    current_streak_days,
    longest_streak_days,
    is_premium,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE((NEW.raw_user_meta_data->>'base_score')::int, 0),
    COALESCE(NEW.raw_user_meta_data->>'score_band', 'early-stage'),
    NEW.raw_user_meta_data->>'learning_preference',
    0,
    0,
    0,
    0,
    false,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Create trigger that fires when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
