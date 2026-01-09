-- Debug script to check why trigger isn't creating user profiles

-- 1. Check if trigger exists and is enabled
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement,
  action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 2. Check if function exists
SELECT
  routine_name,
  routine_type,
  specific_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'handle_new_user';

-- 3. Check what metadata is actually stored in auth.users
SELECT
  id,
  email,
  raw_user_meta_data,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check which auth users are missing from public.users
SELECT
  au.id,
  au.email,
  au.created_at as auth_created,
  CASE WHEN pu.id IS NULL THEN 'MISSING' ELSE 'EXISTS' END as profile_status,
  au.raw_user_meta_data->>'first_name' as metadata_firstname,
  au.raw_user_meta_data->>'base_score' as metadata_score
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
ORDER BY au.created_at DESC;
