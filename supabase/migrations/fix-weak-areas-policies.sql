-- =====================================================
-- Fix weak_areas Table RLS Policies
-- =====================================================
-- Run this ENTIRE script in your Supabase SQL Editor
-- This ensures all RLS policies are correct
-- =====================================================

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own weak areas" ON public.weak_areas;
DROP POLICY IF EXISTS "Users can update own weak areas" ON public.weak_areas;
DROP POLICY IF EXISTS "Users can insert own weak areas" ON public.weak_areas;

-- Create SELECT policy (users can view their own weak areas)
CREATE POLICY "Users can view own weak areas"
  ON public.weak_areas FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- Create INSERT policy (users can insert their own weak areas)
CREATE POLICY "Users can insert own weak areas"
  ON public.weak_areas FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Create UPDATE policy (users can update their own weak areas)
CREATE POLICY "Users can update own weak areas"
  ON public.weak_areas FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- =====================================================
-- Policies fixed successfully!
-- =====================================================
-- Users can now:
-- ✅ SELECT their own weak areas
-- ✅ INSERT their own weak areas
-- ✅ UPDATE their own weak areas
-- =====================================================
