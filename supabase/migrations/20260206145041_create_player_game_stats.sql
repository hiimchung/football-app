/*
  # Create player game stats table

  1. New Tables
    - `player_game_stats`
      - `id` (uuid, primary key)
      - `game_id` (uuid, references games, NOT NULL)
      - `user_id` (uuid, references profiles, NOT NULL)
      - `goals` (integer, default 0) - goals scored by this player in this game
      - `assists` (integer, default 0) - assists made by this player in this game
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      - UNIQUE constraint on (game_id, user_id) to prevent duplicate entries

  2. Security
    - Enable RLS on `player_game_stats`
    - SELECT: Authenticated users can read stats for games they participated in
    - INSERT: Only the game host can insert player stats
    - UPDATE: Only the game host can update player stats
    - DELETE: Only the game host can delete player stats

  3. Notes
    - This stores per-game, per-player statistics entered by the game organizer
    - The aggregate stats (StatsScreen) will be computed from this table
    - Only the host/organizer of a game can record stats for that game
*/

CREATE TABLE IF NOT EXISTS player_game_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  goals integer NOT NULL DEFAULT 0,
  assists integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_player_game_stats_game_id ON player_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_user_id ON player_game_stats(user_id);

ALTER TABLE player_game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stats for their games"
  ON player_game_stats FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM game_players
      WHERE game_players.game_id = player_game_stats.game_id
      AND game_players.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM games
      WHERE games.id = player_game_stats.game_id
      AND games.host_id = auth.uid()
    )
  );

CREATE POLICY "Game host can insert player stats"
  ON player_game_stats FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = player_game_stats.game_id
      AND games.host_id = auth.uid()
    )
  );

CREATE POLICY "Game host can update player stats"
  ON player_game_stats FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = player_game_stats.game_id
      AND games.host_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = player_game_stats.game_id
      AND games.host_id = auth.uid()
    )
  );

CREATE POLICY "Game host can delete player stats"
  ON player_game_stats FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM games
      WHERE games.id = player_game_stats.game_id
      AND games.host_id = auth.uid()
    )
  );

CREATE TRIGGER handle_player_game_stats_updated_at
  BEFORE UPDATE ON player_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
