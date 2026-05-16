alter table profiles
  add column if not exists cancel_at timestamptz,
  add column if not exists canceled_at timestamptz;
