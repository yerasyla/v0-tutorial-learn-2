-- Enable Row Level Security on all tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "courses_select_policy" ON courses;
DROP POLICY IF EXISTS "courses_insert_policy" ON courses;
DROP POLICY IF EXISTS "courses_update_policy" ON courses;
DROP POLICY IF EXISTS "courses_delete_policy" ON courses;

DROP POLICY IF EXISTS "lessons_select_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_update_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_policy" ON lessons;

DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;

-- COURSES TABLE POLICIES
-- Allow public read access to courses
CREATE POLICY "courses_select_policy" ON courses
    FOR SELECT USING (true);

-- Only allow authenticated users to insert courses (will be handled by server actions)
CREATE POLICY "courses_insert_policy" ON courses
    FOR INSERT WITH CHECK (false);

-- Only allow authenticated users to update their own courses (will be handled by server actions)
CREATE POLICY "courses_update_policy" ON courses
    FOR UPDATE USING (false);

-- Only allow authenticated users to delete their own courses (will be handled by server actions)
CREATE POLICY "courses_delete_policy" ON courses
    FOR DELETE USING (false);

-- LESSONS TABLE POLICIES
-- Allow public read access to lessons
CREATE POLICY "lessons_select_policy" ON lessons
    FOR SELECT USING (true);

-- Block all write operations for anon users (will be handled by server actions)
CREATE POLICY "lessons_insert_policy" ON lessons
    FOR INSERT WITH CHECK (false);

CREATE POLICY "lessons_update_policy" ON lessons
    FOR UPDATE USING (false);

CREATE POLICY "lessons_delete_policy" ON lessons
    FOR DELETE USING (false);

-- USER PROFILES TABLE POLICIES
-- Allow public read access to user profiles
CREATE POLICY "user_profiles_select_policy" ON user_profiles
    FOR SELECT USING (true);

-- Block all write operations for anon users (will be handled by server actions)
CREATE POLICY "user_profiles_insert_policy" ON user_profiles
    FOR INSERT WITH CHECK (false);

CREATE POLICY "user_profiles_update_policy" ON user_profiles
    FOR UPDATE USING (false);

CREATE POLICY "user_profiles_delete_policy" ON user_profiles
    FOR DELETE USING (false);

-- DONATIONS TABLE POLICIES
-- Allow public read access to donations
CREATE POLICY "donations_select_policy" ON donations
    FOR SELECT USING (true);

-- Block all write operations for anon users (will be handled by server actions)
CREATE POLICY "donations_insert_policy" ON donations
    FOR INSERT WITH CHECK (false);

CREATE POLICY "donations_update_policy" ON donations
    FOR UPDATE USING (false);

CREATE POLICY "donations_delete_policy" ON donations
    FOR DELETE USING (false);

-- Create a function to set wallet context for server operations
CREATE OR REPLACE FUNCTION set_wallet_context(wallet_address text)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_wallet', wallet_address, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION set_wallet_context(text) TO service_role;
