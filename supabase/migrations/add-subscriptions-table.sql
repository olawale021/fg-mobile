-- Create subscriptions table for RevenueCat webhook sync
-- Users can only read their own row; only service role can write

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  revenuecat_id text,
  product_id text,
  status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Enable RLS
alter table subscriptions enable row level security;

-- Users can read their own subscription
create policy "Users can read own subscription"
  on subscriptions
  for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies for authenticated users
-- Only service_role (used by edge functions) can write
