-- =====================================================
-- Add INSERT Policy to weak_areas Table
-- =====================================================
-- Run this in your Supabase SQL Editor
-- This adds the missing INSERT policy for authenticated users
-- =====================================================

-- Add INSERT policy for weak_areas table
CREATE POLICY "Users can insert own weak areas"
  ON public.weak_areas FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- =====================================================
-- Policy added successfully!
-- =====================================================
-- Users can now insert weak areas for their own account
-- =====================================================
