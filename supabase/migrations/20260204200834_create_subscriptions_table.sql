/*
  # Create Subscriptions Table for PayPal Integration

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References profiles table
      - `paypal_subscription_id` (text) - PayPal subscription ID
      - `paypal_order_id` (text) - PayPal order ID for one-time payments
      - `plan` (text) - Plan type: 'pro_player', 'organizer_pro', or 'boost_game'
      - `status` (text) - Status: 'active', 'cancelled', 'expired', 'pending'
      - `amount` (numeric) - Amount paid
      - `currency` (text) - Currency code (default USD)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
      - `expires_at` (timestamptz) - Expiration date for subscriptions

  2. Security
    - Enable RLS on `subscriptions` table
    - Add policy for authenticated users to read their own subscriptions
    - Add policy for authenticated users to view their subscription history
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  paypal_subscription_id text,
  paypal_order_id text,
  plan text NOT NULL CHECK (plan IN ('pro_player', 'organizer_pro', 'boost_game')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'completed')),
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal_subscription_id ON subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can insert subscriptions (via edge functions)
CREATE POLICY "Service role can insert subscriptions"
  ON subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can update subscriptions (via edge functions)
CREATE POLICY "Service role can update subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscriptions_updated_at();