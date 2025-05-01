/*
  # Subscription Management Schema

  1. New Tables
    - `subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `tier` (text, subscription tier)
      - `status` (text, subscription status)
      - `current_period_start` (timestamptz)
      - `current_period_end` (timestamptz)
      - `cancel_at_period_end` (boolean)
      - `stripe_subscription_id` (text)
      - `stripe_customer_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on subscriptions table
    - Add policies for user access to their own subscription data
*/

-- Create enum for subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'medium', 'premium');

-- Create enum for subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'trialing', 'unpaid');

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL,
    tier subscription_tier NOT NULL DEFAULT 'free',
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start timestamptz NOT NULL DEFAULT now(),
    current_period_end timestamptz NOT NULL DEFAULT now() + interval '1 month',
    cancel_at_period_end boolean NOT NULL DEFAULT false,
    stripe_subscription_id text,
    stripe_customer_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id), -- One active subscription per user
    UNIQUE (stripe_subscription_id),
    UNIQUE (stripe_customer_id)
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscription"
    ON subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users cannot insert subscriptions directly"
    ON subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (false); -- Only allow inserts via functions

CREATE POLICY "Users cannot update subscriptions directly"
    ON subscriptions FOR UPDATE
    TO authenticated
    USING (false); -- Only allow updates via functions

CREATE POLICY "Users cannot delete subscriptions"
    ON subscriptions FOR DELETE
    TO authenticated
    USING (false);

-- Create function to get user's current subscription tier
CREATE OR REPLACE FUNCTION get_user_tier(user_uuid uuid)
RETURNS subscription_tier
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (
        SELECT tier
        FROM subscriptions
        WHERE user_id = user_uuid
        AND status = 'active'
        AND current_period_end > now()
        LIMIT 1
    );
END;
$$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();