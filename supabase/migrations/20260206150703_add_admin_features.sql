/*
  # Admin Dashboard Features

  1. Modified Tables
    - `profiles`
      - Added `role` (text, default 'user') - User role: 'user' or 'admin'
      - Added `banned` (boolean, default false) - Whether user is banned
    - `games`
      - Added `featured` (boolean, default false) - Whether game is featured by admins

  2. Security
    - Added admin RLS policy on profiles for UPDATE (ban/unban, role changes)
    - Added admin RLS policy on games for UPDATE (featuring) and DELETE
    - Added admin RLS policy on subscriptions for SELECT (view all)

  3. Notes
    - Admin users are identified by profiles.role = 'admin'
    - To create the first admin, run: UPDATE profiles SET role = 'admin' WHERE username = 'your-email';
    - Banned users are blocked at the application level during login
    - Featured games can be promoted in the main app
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'user';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banned'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banned boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'featured'
  ) THEN
    ALTER TABLE games ADD COLUMN featured boolean NOT NULL DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned);
CREATE INDEX IF NOT EXISTS idx_games_featured ON games(featured);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
      ON profiles FOR UPDATE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'games' AND policyname = 'Admins can update any game'
  ) THEN
    CREATE POLICY "Admins can update any game"
      ON games FOR UPDATE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'games' AND policyname = 'Admins can delete any game'
  ) THEN
    CREATE POLICY "Admins can delete any game"
      ON games FOR DELETE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'subscriptions' AND policyname = 'Admins can view all subscriptions'
  ) THEN
    CREATE POLICY "Admins can view all subscriptions"
      ON subscriptions FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;
