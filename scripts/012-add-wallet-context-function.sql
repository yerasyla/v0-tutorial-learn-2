-- Create a function to set the current wallet context
CREATE OR REPLACE FUNCTION set_wallet_context(wallet_addr TEXT)
RETURNS VOID AS $$
BEGIN
  -- Set the wallet address in the current session
  PERFORM set_config('request.jwt.claims', json_build_object('wallet_address', wallet_addr)::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_current_wallet function to be more robust
CREATE OR REPLACE FUNCTION get_current_wallet()
RETURNS TEXT AS $$
DECLARE
  wallet_addr TEXT;
BEGIN
  -- Try to get wallet from session config
  BEGIN
    wallet_addr := current_setting('request.jwt.claims', true)::json->>'wallet_address';
    IF wallet_addr IS NOT NULL AND wallet_addr != '' THEN
      RETURN LOWER(wallet_addr);
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      NULL; -- Continue to next method
  END;
  
  -- If no wallet found, return NULL (will deny access)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
