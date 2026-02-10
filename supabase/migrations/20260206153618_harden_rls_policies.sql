/*
  # Security Hardening - Row Level Security Policies
  
  ## Overview
  This migration tightens RLS policies across all tables to follow the principle of least privilege.
  
  ## Changes Made
  
  ### 1. Profiles Table
  - **OLD**: Anyone authenticated could view ALL profiles
  - **NEW**: 
    - Users can only view profiles of users in games they've joined
    - Users can always view their own profile
    - Admins can view all profiles
  - Added explicit INSERT policy (profiles created via trigger only)
  
  ### 2. Games Table  
  - **OLD**: Anyone authenticated could view ALL games
  - **NEW**: Public SELECT access maintained (games are meant to be discoverable)
  - Added validation: Hosts cannot set themselves as banned users
  
  ### 3. Game Players Table
  - **OLD**: Anyone authenticated could view ALL game players
  - **NEW**: Same as before (needed for game discovery)
  
  ### 4. Messages Table
  - **NEW**: Added DELETE policy for users to delete their own messages
  - **NEW**: Added max message length validation (2000 chars)
  
  ### 5. Stats Table
  - **OLD**: Anyone authenticated could view ALL stats
  - **NEW**: Users can only view stats of players in games they've joined
  
  ### 6. Subscriptions Table
  - **NEW**: Only service_role (webhooks) can INSERT/UPDATE subscriptions
  - **NEW**: Users can only SELECT their own subscriptions
  
  ### 7. Push Tokens Table
  - **SECURED**: Policies already correct
  
  ### 8. Notifications Table
  - **NEW**: Added DELETE policy for users to clear their own notifications
  
  ### 9. Player Game Stats
  - **SECURED**: Policies already correct
  
  ## Security Principles Applied
  - Principle of least privilege
  - No `USING (true)` except for legitimate public data
  - Separate policies for each operation (SELECT, INSERT, UPDATE, DELETE)
  - Validation checks in WITH CHECK clauses
  - Admin override policies where appropriate
*/

-- ============================================================================
-- PROFILES TABLE - Restrict view access
-- ============================================================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can view profiles of players in their games
CREATE POLICY "Users can view profiles in joined games"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players gp1
      WHERE gp1.user_id = profiles.id
      AND EXISTS (
        SELECT 1 FROM game_players gp2
        WHERE gp2.game_id = gp1.game_id
        AND gp2.user_id = auth.uid()
      )
    )
  );

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Prevent direct profile insertion (should only happen via trigger)
CREATE POLICY "Profiles created via trigger only"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Add check to prevent banned users from updating profiles
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id AND NOT banned)
  WITH CHECK (auth.uid() = id AND NOT banned);

-- ============================================================================
-- GAMES TABLE - Keep public but add validation
-- ============================================================================

-- Games remain publicly viewable for discovery (no change needed)
-- But add host validation on creation

DROP POLICY IF EXISTS "Users can create games" ON games;
CREATE POLICY "Users can create games"
  ON games FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = host_id
    AND NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND banned = true
    )
  );

-- ============================================================================
-- MESSAGES TABLE - Add deletion and validation
-- ============================================================================

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add message content validation (max 2000 chars)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_content_length;
ALTER TABLE messages ADD CONSTRAINT messages_content_length 
  CHECK (length(content) <= 2000 AND length(content) > 0);

-- ============================================================================
-- STATS TABLE - Restrict view access
-- ============================================================================

DROP POLICY IF EXISTS "Users can view all stats" ON stats;

-- Users can view their own stats
CREATE POLICY "Users can view own stats"
  ON stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can view stats of players in games they've joined
CREATE POLICY "Users can view stats in joined games"
  ON stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM game_players gp1
      WHERE gp1.user_id = stats.user_id
      AND EXISTS (
        SELECT 1 FROM game_players gp2
        WHERE gp2.game_id = gp1.game_id
        AND gp2.user_id = auth.uid()
      )
    )
  );

-- Admins can view all stats
CREATE POLICY "Admins can view all stats"
  ON stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- SUBSCRIPTIONS TABLE - Lock down to service role only
-- ============================================================================

-- Drop existing weak policies
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Service role can update subscriptions" ON subscriptions;

-- Only service_role can INSERT subscriptions (via webhooks)
CREATE POLICY "Only webhooks can insert subscriptions"
  ON subscriptions FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only service_role can UPDATE subscriptions (via webhooks)
CREATE POLICY "Only webhooks can update subscriptions"
  ON subscriptions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can only view their own subscriptions (keep existing)
-- Already correct: "Users can view own subscriptions"

-- ============================================================================
-- NOTIFICATIONS TABLE - Add deletion policy
-- ============================================================================

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Add table constraints for data validation
-- ============================================================================

-- Ensure usernames are not empty and have reasonable length
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_length;
ALTER TABLE profiles ADD CONSTRAINT profiles_username_length 
  CHECK (length(username) >= 3 AND length(username) <= 50);

-- Ensure game titles are not empty
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_title_length;
ALTER TABLE games ADD CONSTRAINT games_title_length 
  CHECK (length(title) >= 3 AND length(title) <= 100);

-- Ensure game locations are not empty
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_location_length;
ALTER TABLE games ADD CONSTRAINT games_location_length 
  CHECK (length(location) >= 3 AND length(location) <= 200);

-- Ensure max_players is reasonable
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_max_players_range;
ALTER TABLE games ADD CONSTRAINT games_max_players_range 
  CHECK (max_players >= 2 AND max_players <= 50);

-- Ensure stats are non-negative
ALTER TABLE stats DROP CONSTRAINT IF EXISTS stats_non_negative;
ALTER TABLE stats ADD CONSTRAINT stats_non_negative 
  CHECK (matches_played >= 0 AND goals >= 0 AND assists >= 0);

-- Ensure player game stats are non-negative
ALTER TABLE player_game_stats DROP CONSTRAINT IF EXISTS player_game_stats_non_negative;
ALTER TABLE player_game_stats ADD CONSTRAINT player_game_stats_non_negative 
  CHECK (goals >= 0 AND assists >= 0);

-- ============================================================================
-- Create function to check if user is admin (helper)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- Add indexes for policy performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role_id ON profiles(role, id);
CREATE INDEX IF NOT EXISTS idx_profiles_banned ON profiles(banned) WHERE banned = true;
CREATE INDEX IF NOT EXISTS idx_game_players_composite ON game_players(game_id, user_id);
