-- Recreate the trigger function with proper error handling and logging
-- This will help us see why it's not working during actual signups

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log that trigger fired
  RAISE LOG 'Trigger fired for user: %', NEW.email;

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

    RAISE LOG 'Successfully created user profile for: %', NEW.email;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE LOG 'ERROR creating user profile for %: % (SQLSTATE: %)', NEW.email, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Make sure the trigger is properly attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger is created
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
