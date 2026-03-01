-- Setup pg_cron to run the lesson-reminder function every hour on Tuesday and Friday
-- Run this in Supabase SQL Editor after deploying the edge function

-- Schedule the edge function to run every hour on Tue (2) and Fri (5)
-- The function checks each user's timezone to determine if it's 10am
-- First remove the old broken job if it exists
SELECT cron.unschedule('lesson-reminder');

SELECT cron.schedule(
  'lesson-reminder',          -- Job name
  '0 * * * 2,5',              -- Every hour on Tuesday and Friday
  $$
    SELECT net.http_post(
      url := 'https://svzxbflspfeutigdctqa.supabase.co/functions/v1/lesson-reminder',
      headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2enhiZmxzcGZldXRpZ2RjdHFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE5MzAxNiwiZXhwIjoyMDgwNzY5MDE2fQ.iQ1tfxSVJpbJe4kHvWOcYF3Bm-w7GpQuIkBbh9uSwwI", "Content-Type": "application/json"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the job:
-- SELECT cron.unschedule('lesson-reminder');
