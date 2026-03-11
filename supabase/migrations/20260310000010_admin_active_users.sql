-- Create RPC to get active users from auth.users (last 24h)
CREATE OR REPLACE FUNCTION get_active_users_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM auth.users
  WHERE last_sign_in_at >= (NOW() - INTERVAL '24 hours');
  
  RETURN active_count;
END;
$$;
