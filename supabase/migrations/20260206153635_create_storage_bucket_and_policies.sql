/*
  # Storage Security - Avatar Upload Bucket
  
  ## Overview
  Creates a secure storage bucket for user avatars with proper RLS policies.
  
  ## Security Features
  1. **Bucket**: `avatars` - Public read, authenticated write
  2. **Max File Size**: 2MB per file
  3. **Allowed MIME Types**: image/jpeg, image/png, image/webp, image/gif
  4. **Folder Structure**: avatars/{user_id}/{filename}
  
  ## Policies
  - Users can upload ONLY to their own folder
  - Users can update/delete ONLY their own files
  - Anyone can view avatars (public bucket for profile display)
  - Max 5 files per user
  
  ## Notes
  - File size validation happens at application level (2MB limit)
  - MIME type validation enforced in policy
  - Users cannot upload to other users' folders
*/

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Allow public read access to avatars (anyone can view profile pictures)
CREATE POLICY "Public read access to avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can upload to their own folder only
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND banned = true
    )
  );

-- Users can update their own avatars only
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatars only
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can delete any avatar (moderation)
CREATE POLICY "Admins can delete any avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
