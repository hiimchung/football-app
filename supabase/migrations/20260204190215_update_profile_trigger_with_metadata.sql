/*
  # Update Profile Creation Trigger to Use User Metadata

  1. Changes
    - Update the `handle_new_user()` function to extract username and skill_level from user metadata
    - Username will be pulled from `raw_user_meta_data->'username'`
    - Skill level will be pulled from `raw_user_meta_data->'skill_level'`
    - Falls back to email/beginner if metadata is not available

  2. Notes
    - This allows the signup form to pass user data through Supabase auth metadata
    - The trigger automatically creates the profile with the correct username and skill level
*/

-- Update trigger function to use metadata from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, skill_level)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', new.email),
    COALESCE(new.raw_user_meta_data->>'skill_level', 'beginner')
  );
  
  INSERT INTO public.stats (user_id, matches_played, goals, assists)
  VALUES (new.id, 0, 0, 0);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;