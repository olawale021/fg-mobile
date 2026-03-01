-- Run this in Supabase SQL Editor
-- Replace YOUR_ANON_KEY with your anon public key from Settings → API

-- Remove old job if exists
SELECT cron.unschedule('test-push-647am');
SELECT cron.unschedule('test-push-645am');
SELECT cron.unschedule('test-push-655am');

-- Schedule for 7:00 AM UK time (change the time as needed)
SELECT cron.schedule(
  'test-push',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://svzxbflspfeutigdctqa.supabase.co/functions/v1/test-push-notification',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- To test immediately (run this line separately):
-- SELECT net.http_post(
--   url := 'https://svzxbflspfeutigdctqa.supabase.co/functions/v1/test-push-notification',
--   headers := '{"Content-Type": "application/json", "Authorization": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2enhiZmxzcGZldXRpZ2RjdHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTMwMTYsImV4cCI6MjA4MDc2OTAxNn0.zr5sqpeitBHO2Gd_Fxd-dqjhgEgR4XiPCvZ7BxqH60E"}'::jsonb,
--   body := '{}'::jsonb
-- );

-- To check if job exists:
-- SELECT * FROM cron.job WHERE jobname = 'test-push';

-- To remove job after testing:
-- SELECT cron.unschedule('test-push');
