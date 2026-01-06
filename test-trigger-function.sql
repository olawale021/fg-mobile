-- Test what happens when we manually run the trigger function logic
-- This will show us the actual error

DO $$
DECLARE
  test_user_id uuid;
  test_email text;
  test_metadata jsonb;
BEGIN
  -- Get the most recent auth user
  SELECT id, email, raw_user_meta_data
  INTO test_user_id, test_email, test_metadata
  FROM auth.users
  ORDER BY created_at DESC
  LIMIT 1;

  RAISE NOTICE 'Testing with user: % (%)', test_email, test_user_id;
  RAISE NOTICE 'Metadata: %', test_metadata;

  -- Try to insert using the same logic as the trigger
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
    test_user_id,
    test_email,
    COALESCE(test_metadata->>'first_name', ''),
    COALESCE(test_metadata->>'last_name', ''),
    COALESCE(test_metadata->>'location', ''),
    COALESCE((test_metadata->>'base_score')::int, 0),
    COALESCE(test_metadata->>'score_band', 'early-stage'),
    test_metadata->>'learning_preference',
    0,
    0,
    0,
    0,
    false,
    NOW()
  );

  RAISE NOTICE 'SUCCESS: User profile created!';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR: %', SQLERRM;
  RAISE NOTICE 'DETAIL: %', SQLSTATE;
END $$;
