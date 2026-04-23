-- Role-based access control table
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user'
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own role only
CREATE POLICY "users_read_own_role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update/delete roles
CREATE POLICY "service_role_write" ON user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- Seed the admin user by email lookup.
-- Run this block manually in the Supabase SQL editor after the migration if the
-- DO block cannot resolve the email at migration time:
--   INSERT INTO user_roles (user_id, role)
--   SELECT id, 'admin' FROM auth.users WHERE email = '<your-admin-email>'
--   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM auth.users
  WHERE email = (SELECT current_setting('app.settings.admin_email', true))
  LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (v_admin_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  END IF;
END $$;
