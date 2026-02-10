/*
  # Add geolocation coordinates to games table

  1. Modified Tables
    - `games`
      - `latitude` (double precision, nullable) - Game location latitude
      - `longitude` (double precision, nullable) - Game location longitude

  2. Indexes
    - Composite index on (latitude, longitude) for spatial queries

  3. Notes
    - Columns are nullable to preserve existing games without coordinates
    - No data migration needed - existing games will have NULL coordinates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE games ADD COLUMN latitude double precision;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'games' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE games ADD COLUMN longitude double precision;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_games_coordinates ON games(latitude, longitude);
