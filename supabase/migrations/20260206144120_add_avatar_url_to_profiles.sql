/*
  # Add avatar support to profiles

  1. Modified Tables
    - `profiles`
      - Added `avatar_url` (text, nullable) - stores the public URL of the user's profile picture

  2. Notes
    - Column is nullable since users may not upload a profile picture
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;
END $$;
