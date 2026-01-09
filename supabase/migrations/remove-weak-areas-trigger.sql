-- =====================================================
-- Remove Weak Areas Database Trigger
-- =====================================================
-- Run this in your Supabase SQL Editor
-- This removes the automatic trigger since we now handle
-- weak area analysis in the mobile app code
-- =====================================================

-- Drop the trigger
DROP TRIGGER IF EXISTS trigger_auto_analyze_weak_areas ON public.test_responses;

-- Drop the trigger function (optional - we might want to keep the analyze_weak_areas function for manual use)
DROP FUNCTION IF EXISTS public.auto_analyze_weak_areas();

-- =====================================================
-- Optional: Drop the RPC function too if not needed
-- =====================================================
-- Uncomment the line below if you want to completely remove the database function
-- DROP FUNCTION IF EXISTS public.analyze_weak_areas(UUID, UUID);

-- =====================================================
-- Trigger removed successfully!
-- =====================================================
-- Weak area analysis is now handled by the mobile app
-- in /lib/weak-areas.ts and called from /app/user-info.tsx
-- =====================================================
