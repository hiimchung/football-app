/*
  # Add status column to games table

  1. Modified Tables
    - `games`
      - `status` (text, default 'open') - Tracks whether a game is open for joining or has been closed by the host
      - Allowed values: 'open', 'closed'

  2. Security
    - Existing RLS policies already cover host updates on games
    - Hosts can update their own games (which includes setting status)

  3. Index
    - Added index on status for efficient filtering
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'status'
  ) THEN
    ALTER TABLE games ADD COLUMN status text DEFAULT 'open' CHECK (status IN ('open', 'closed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
