-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all admin records (for listing in settings)
CREATE POLICY "allow_read_admin_users" ON admin_users
  FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated admins can create new admin users
CREATE POLICY "allow_create_admin_users" ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Index on email for faster lookups
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users(email);
CREATE INDEX IF NOT EXISTS admin_users_created_by_idx ON admin_users(created_by);
