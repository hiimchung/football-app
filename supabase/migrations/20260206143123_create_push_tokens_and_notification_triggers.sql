/*
  # Push Notifications: tokens table and notification triggers

  1. New Tables
    - `push_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `token` (text, the Expo push token)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (user_id, token)

    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles) - recipient
      - `title` (text)
      - `body` (text)
      - `data` (jsonb) - navigation context
      - `read` (boolean, default false)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Users can manage their own push tokens
    - Users can read their own notifications

  3. Functions
    - `notify_new_message()` - trigger on messages INSERT
    - `notify_player_joined()` - trigger on game_players INSERT
    - `notify_game_closed()` - trigger on games UPDATE when status changes to closed
*/

-- Push tokens table
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert notifications (from edge functions / triggers)
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow authenticated inserts for trigger functions running as SECURITY DEFINER
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Updated at trigger for push_tokens
DROP TRIGGER IF EXISTS set_updated_at_push_tokens ON push_tokens;
CREATE TRIGGER set_updated_at_push_tokens
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function: notify on new chat message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger AS $$
DECLARE
  sender_name text;
  game_title text;
  player_record record;
BEGIN
  SELECT username INTO sender_name FROM profiles WHERE id = NEW.user_id;
  SELECT title INTO game_title FROM games WHERE id = NEW.game_id;

  FOR player_record IN
    SELECT gp.user_id
    FROM game_players gp
    WHERE gp.game_id = NEW.game_id
      AND gp.user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, title, body, data)
    VALUES (
      player_record.user_id,
      game_title,
      COALESCE(sender_name, 'Someone') || ': ' || LEFT(NEW.content, 100),
      jsonb_build_object('type', 'chat_message', 'gameId', NEW.game_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message_notify ON messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Function: notify host when someone joins their game
CREATE OR REPLACE FUNCTION public.notify_player_joined()
RETURNS trigger AS $$
DECLARE
  joiner_name text;
  game_record record;
BEGIN
  SELECT username INTO joiner_name FROM profiles WHERE id = NEW.user_id;

  SELECT id, title, host_id INTO game_record FROM games WHERE id = NEW.game_id;

  IF game_record.host_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, body, data)
    VALUES (
      game_record.host_id,
      'Player Joined',
      COALESCE(joiner_name, 'Someone') || ' joined your game "' || game_record.title || '"',
      jsonb_build_object('type', 'player_joined', 'gameId', NEW.game_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_player_joined_notify ON game_players;
CREATE TRIGGER on_player_joined_notify
  AFTER INSERT ON game_players
  FOR EACH ROW EXECUTE FUNCTION public.notify_player_joined();

-- Function: notify players when game is closed/cancelled
CREATE OR REPLACE FUNCTION public.notify_game_closed()
RETURNS trigger AS $$
DECLARE
  player_record record;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'closed' THEN
    FOR player_record IN
      SELECT gp.user_id
      FROM game_players gp
      WHERE gp.game_id = NEW.id
        AND gp.user_id != NEW.host_id
    LOOP
      INSERT INTO notifications (user_id, title, body, data)
      VALUES (
        player_record.user_id,
        'Game Closed',
        '"' || NEW.title || '" has been closed by the host',
        jsonb_build_object('type', 'game_closed', 'gameId', NEW.id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_game_closed_notify ON games;
CREATE TRIGGER on_game_closed_notify
  AFTER UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION public.notify_game_closed();
