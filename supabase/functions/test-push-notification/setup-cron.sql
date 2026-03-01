-- Schedule test push notification for 6:45 AM UK time
-- Run this in Supabase SQL Editor after deploying the edge function

-- Schedule the test function to run at 6:45 AM UTC (UK winter time)
SELECT cron.schedule(
  'test-push-645am',
  '45 6 * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT current_setting('app.settings.supabase_url') || '/functions/v1/test-push-notification'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT current_setting('app.settings.service_role_key'))
      ),
      body := '{}'::jsonb
    );
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the job after testing:
-- SELECT cron.unschedule('test-push-645am');
