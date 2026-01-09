-- Fix RLS policy for user insert during registration
-- The issue: After signUp, the session isn't immediately established, so auth.uid() is null
-- Solution: Allow insert if the user exists in auth.users (they just signed up)

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Create new insert policy that allows authenticated users to insert
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Alternative: More strict - only allow if the ID matches an existing auth user
-- This ensures users can only create profiles for accounts that exist in auth.users
-- Uncomment this if you want stricter security:

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id IN (SELECT id FROM auth.users)
  );
