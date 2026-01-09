-- Add notification preference columns to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
