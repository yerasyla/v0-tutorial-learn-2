-- Add Twitter handle field to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS twitter_handle VARCHAR(100);

-- Create index for Twitter handle lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_twitter ON user_profiles(twitter_handle) WHERE twitter_handle IS NOT NULL;

-- Add validation function for Twitter handles (optional)
CREATE OR REPLACE FUNCTION validate_twitter_handle(handle TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Twitter handles can be 1-15 characters, alphanumeric and underscores only
  RETURN handle ~ '^[A-Za-z0-9_]{1,15}$';
END;
$$ LANGUAGE plpgsql;
