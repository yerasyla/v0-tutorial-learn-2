-- Add verification fields to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Create index for verified creators
CREATE INDEX IF NOT EXISTS idx_user_profiles_verified ON user_profiles(is_verified) WHERE is_verified = TRUE;

-- Create a function to verify a creator
CREATE OR REPLACE FUNCTION verify_creator(creator_wallet VARCHAR(42), notes TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    is_verified = TRUE,
    verification_date = NOW(),
    verification_notes = notes
  WHERE wallet_address = LOWER(creator_wallet);
  
  -- If profile doesn't exist, create it as verified
  IF NOT FOUND THEN
    INSERT INTO user_profiles (wallet_address, is_verified, verification_date, verification_notes)
    VALUES (LOWER(creator_wallet), TRUE, NOW(), notes);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a function to unverify a creator
CREATE OR REPLACE FUNCTION unverify_creator(creator_wallet VARCHAR(42))
RETURNS VOID AS $$
BEGIN
  UPDATE user_profiles 
  SET 
    is_verified = FALSE,
    verification_date = NULL,
    verification_notes = NULL
  WHERE wallet_address = LOWER(creator_wallet);
END;
$$ LANGUAGE plpgsql;

-- Example: Verify some demo creators (you can remove this or add your own)
-- SELECT verify_creator('0x1234567890123456789012345678901234567890', 'Verified educational content creator');
