-- Update the avatar_url field to TEXT type to support larger data
ALTER TABLE user_profiles 
ALTER COLUMN avatar_url TYPE TEXT;
