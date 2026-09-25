/*
  # Add Personal Details Fields to Profiles

  1. New Fields in profiles table
    - `age` (integer, optional)
    - `gender` (text, optional)
    - `occupation` (text, optional)
    - `address` (text, optional)
    - `profile_completed` (boolean, default false)

  2. Purpose
    - Capture personal safety information
    - Track profile completion status
    - Better personalization and emergency contact purposes
*/

-- Add new columns to profiles table
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS age integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS occupation text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Create index for profile_completed status (for quick querying)
CREATE INDEX IF NOT EXISTS idx_profiles_completed ON profiles(profile_completed);

-- Update RLS Policies to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure users can read their own profile
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;

CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Ensure users can insert their own profile
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

