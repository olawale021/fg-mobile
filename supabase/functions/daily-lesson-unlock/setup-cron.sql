-- Setup pg_cron to run the daily-lesson-unlock function every hour
-- Run this in Supabase SQL Editor after deploying the edge function

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the edge function to run every hour at minute 0
-- The function will check each user's timezone to determine if it's 8am
SELECT cron.schedule(
  'daily-lesson-unlock',  -- Job name
  '0 * * * *',            -- Run at the start of every hour
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url') || '/functions/v1/daily-lesson-unlock'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key'))
      ),
      body := '{}'::jsonb
    );
  $$
);

-- Alternative: Use Supabase's built-in scheduled functions
-- Go to Supabase Dashboard > Edge Functions > Your Function > Settings > Schedule
-- Set cron expression: 0 * * * * (every hour at minute 0)

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the job:
-- SELECT cron.unschedule('daily-lesson-unlock');
