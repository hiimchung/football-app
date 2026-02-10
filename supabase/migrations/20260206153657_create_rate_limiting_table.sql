/*
  # Rate Limiting Infrastructure
  
  ## Overview
  Creates infrastructure for rate limiting to prevent abuse.
  
  ## Tables
  
  ### rate_limits
  Tracks API call attempts by user/IP for rate limiting.
  
  - `id` (uuid) - Primary key
  - `identifier` (text) - User ID or IP address
  - `action` (text) - Action being rate limited (e.g., 'login', 'create_game', 'send_message')
  - `attempts` (integer) - Number of attempts
  - `window_start` (timestamptz) - Start of current time window
  - `created_at` (timestamptz) - Record creation time
  
  ## Rate Limit Rules
  
  - **Login**: 5 attempts per 15 minutes per IP
  - **Create Game**: 10 games per hour per user
  - **Send Message**: 30 messages per minute per user
  - **Send Push**: 100 pushes per hour per user (admin only)
  
  ## Cleanup
  
  Automatic cleanup function removes records older than 24 hours.
  
  ## Security
  
  - No RLS needed (accessed only via service_role in edge functions)
  - Indexed for fast lookups
*/

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- user_id or IP address
  action text NOT NULL, -- 'login', 'create_game', 'send_message', etc.
  attempts integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(identifier, action)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_action 
  ON rate_limits(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
  ON rate_limits(window_start);

-- No RLS needed - only accessed via service_role in edge functions
ALTER TABLE rate_limits DISABLE ROW LEVEL SECURITY;

-- Function to check and increment rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer,
  p_window_minutes integer
)
RETURNS boolean AS $$
DECLARE
  v_attempts integer;
  v_window_start timestamptz;
  v_cutoff timestamptz;
BEGIN
  -- Calculate cutoff time
  v_cutoff := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Get current attempts and window start
  SELECT attempts, window_start
  INTO v_attempts, v_window_start
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action = p_action;
  
  -- If no record exists or window expired, create/reset
  IF v_attempts IS NULL OR v_window_start < v_cutoff THEN
    INSERT INTO rate_limits (identifier, action, attempts, window_start)
    VALUES (p_identifier, p_action, 1, now())
    ON CONFLICT (identifier, action)
    DO UPDATE SET
      attempts = 1,
      window_start = now();
    
    RETURN true; -- Allow the action
  END IF;
  
  -- If within limit, increment and allow
  IF v_attempts < p_max_attempts THEN
    UPDATE rate_limits
    SET attempts = attempts + 1
    WHERE identifier = p_identifier
      AND action = p_action;
    
    RETURN true; -- Allow the action
  END IF;
  
  -- Exceeded limit
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function to remove old records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (run once per hour via pg_cron if available)
-- Note: This requires pg_cron extension
-- If pg_cron is not available, old records will accumulate but won't affect functionality
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule(
      'cleanup-rate-limits',
      '0 * * * *', -- Every hour
      'SELECT cleanup_rate_limits()'
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron not available, skip scheduling
    NULL;
END $$;
