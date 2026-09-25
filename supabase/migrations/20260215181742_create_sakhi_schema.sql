/*
  # Sakhi Safety Navigation App - Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `phone` (text)
      - `safety_credits` (integer, default 0)
      - `emergency_contacts` (jsonb, array of contact objects)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `safe_havens`
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text: hospital, police, fire_station, 24_7_business)
      - `address` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `phone` (text)
      - `is_verified` (boolean)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
    
    - `safety_reports`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `report_type` (text: broken_light, unsafe_area, safe_spot, other)
      - `description` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `photo_url` (text, optional)
      - `severity` (integer, 1-5)
      - `status` (text: pending, verified, resolved)
      - `upvotes` (integer, default 0)
      - `created_at` (timestamptz)
    
    - `guardian_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `start_location` (jsonb, {lat, lng, address})
      - `end_location` (jsonb, {lat, lng, address})
      - `current_location` (jsonb, {lat, lng, timestamp})
      - `status` (text: active, completed, emergency)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
    
    - `route_ratings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `route_hash` (text, unique identifier for route)
      - `safety_score` (integer, 0-100)
      - `rating` (integer, 1-5)
      - `feedback` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Public read access for safe_havens and verified safety_reports
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  safety_credits integer DEFAULT 0,
  emergency_contacts jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create safe_havens table
CREATE TABLE IF NOT EXISTS safe_havens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('hospital', 'police', 'fire_station', '24_7_business', 'other')),
  address text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  phone text,
  is_verified boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create safety_reports table
CREATE TABLE IF NOT EXISTS safety_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('broken_light', 'unsafe_area', 'safe_spot', 'other')),
  description text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  photo_url text,
  severity integer DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'resolved')),
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create guardian_sessions table
CREATE TABLE IF NOT EXISTS guardian_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  start_location jsonb NOT NULL,
  end_location jsonb,
  current_location jsonb,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'emergency')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create route_ratings table
CREATE TABLE IF NOT EXISTS route_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  route_hash text NOT NULL,
  safety_score integer CHECK (safety_score BETWEEN 0 AND 100),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  feedback text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_safe_havens_location ON safe_havens(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_safety_reports_location ON safety_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_safety_reports_status ON safety_reports(status);
CREATE INDEX IF NOT EXISTS idx_guardian_sessions_user_status ON guardian_sessions(user_id, status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_havens ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_ratings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Safe havens policies (public read, authenticated write)
CREATE POLICY "Anyone can view verified safe havens"
  ON safe_havens FOR SELECT
  TO authenticated
  USING (is_verified = true OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create safe havens"
  ON safe_havens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own safe havens"
  ON safe_havens FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Safety reports policies
CREATE POLICY "Anyone can view verified safety reports"
  ON safety_reports FOR SELECT
  TO authenticated
  USING (status IN ('verified', 'resolved') OR user_id = auth.uid());

CREATE POLICY "Authenticated users can create safety reports"
  ON safety_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own safety reports"
  ON safety_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Guardian sessions policies
CREATE POLICY "Users can view their own guardian sessions"
  ON guardian_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own guardian sessions"
  ON guardian_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guardian sessions"
  ON guardian_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Route ratings policies
CREATE POLICY "Users can view all route ratings"
  ON route_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create route ratings"
  ON route_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to award safety credits
CREATE OR REPLACE FUNCTION award_safety_credits()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' AND OLD.status = 'pending' THEN
    UPDATE profiles
    SET safety_credits = safety_credits + 10
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to award credits when reports are verified
CREATE TRIGGER award_credits_on_verification
  AFTER UPDATE ON safety_reports
  FOR EACH ROW
  EXECUTE FUNCTION award_safety_credits();