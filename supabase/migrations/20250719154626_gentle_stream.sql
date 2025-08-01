/*
  # Add WebAuthn Challenges Table

  1. New Tables
    - `webauthn_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable for usernameless flow)
      - `challenge` (text, the challenge string)
      - `type` (enum, registration or authentication)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `webauthn_challenges` table
    - Add policies for authenticated users
*/

-- Create challenge type enum
CREATE TYPE challenge_type AS ENUM ('registration', 'authentication');

-- Create webauthn_challenges table
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  challenge text NOT NULL,
  type challenge_type NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access own challenges"
  ON webauthn_challenges
  FOR ALL
  TO authenticated
  USING (
    user_id IS NULL OR 
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    user_id IS NULL OR 
    auth.uid()::text = user_id::text OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.is_admin = true
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id ON webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_type ON webauthn_challenges(type);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires_at ON webauthn_challenges(expires_at);

-- Auto-cleanup expired challenges (run every hour)
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn_challenges 
  WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Note: In production, you would set up a cron job to run this function
-- For now, it can be called manually or triggered by application logic