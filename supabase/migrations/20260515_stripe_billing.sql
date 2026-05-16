alter table profiles
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id text,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz;

alter table profiles
  drop constraint if exists profiles_plan_check;

alter table profiles
  add constraint profiles_plan_check
  check (plan in ('free', 'starter', 'growth', 'agency', 'pro'));
