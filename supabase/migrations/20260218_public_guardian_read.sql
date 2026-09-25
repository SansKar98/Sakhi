/*
  # Public read access for Guardian Sessions

  1. Security
    - Add a policy allowing anyone to read guardian sessions. 
    - This is required so unauthenticated emergency contacts can view a user's live location
      if they possess the unguessable session UUID.
*/

-- Allow public read access for guardian sessions
DROP POLICY IF EXISTS "Anyone can view a guardian session" ON guardian_sessions;

CREATE POLICY "Anyone can view a guardian session"
  ON guardian_sessions
  FOR SELECT
  USING (true);
