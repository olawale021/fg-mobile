-- Run this in Supabase SQL Editor to manually trigger the daily-lesson-unlock function
-- The force flag bypasses the 8am timezone check and already-unlocked-today check
SELECT net.http_post(
  url := 'https://svzxbflspfeutigdctqa.supabase.co/functions/v1/smooth-service',
  headers := '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2enhiZmxzcGZldXRpZ2RjdHFhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTE5MzAxNiwiZXhwIjoyMDgwNzY5MDE2fQ.iQ1tfxSVJpbJe4kHvWOcYF3Bm-w7GpQuIkBbh9uSwwI","Content-Type":"application/json"}'::jsonb,
  body := '{"force":true}'::jsonb
);
