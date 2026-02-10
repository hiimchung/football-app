/*
  # Create PayPal Plans Cache Table

  1. New Tables
    - `paypal_plans`
      - `id` (uuid, primary key)
      - `plan_key` (text, unique) - Internal plan identifier (e.g., 'pro_player')
      - `paypal_product_id` (text) - PayPal product ID
      - `paypal_plan_id` (text) - PayPal billing plan ID
      - `name` (text) - Human-readable plan name
      - `amount` (numeric) - Monthly price
      - `currency` (text) - Currency code
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `paypal_plans` table
    - Add read policy for authenticated users
    - Write access only via service role (edge functions)
*/

CREATE TABLE IF NOT EXISTS paypal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text UNIQUE NOT NULL,
  paypal_product_id text NOT NULL,
  paypal_plan_id text NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE paypal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read plans"
  ON paypal_plans
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
