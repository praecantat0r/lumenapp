alter table profiles
  add column if not exists last_cron_error      text,
  add column if not exists last_cron_error_at   timestamptz;
