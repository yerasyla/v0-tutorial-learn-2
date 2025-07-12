-- First, disable RLS temporarily to clean up
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE donations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
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

DROP POLICY IF EXISTS "donations_select_policy" ON donations;
DROP POLICY IF EXISTS "donations_insert_policy" ON donations;
DROP POLICY IF EXISTS "donations_update_policy" ON donations;
DROP POLICY IF EXISTS "donations_delete_policy" ON donations;

-- Re-enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- COURSES TABLE POLICIES
-- Allow public read access to courses
CREATE POLICY "courses_select_policy" ON courses
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Completely block INSERT for anon role
CREATE POLICY "courses_insert_block_anon" ON courses
    FOR INSERT 
    TO anon
    WITH CHECK (false);

-- Allow INSERT only for service_role (our server actions)
CREATE POLICY "courses_insert_service" ON courses
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

-- Block UPDATE for anon role
CREATE POLICY "courses_update_block_anon" ON courses
    FOR UPDATE 
    TO anon
    USING (false);

-- Allow UPDATE only for service_role
CREATE POLICY "courses_update_service" ON courses
    FOR UPDATE 
    TO service_role
    USING (true);

-- Block DELETE for anon role
CREATE POLICY "courses_delete_block_anon" ON courses
    FOR DELETE 
    TO anon
    USING (false);

-- Allow DELETE only for service_role
CREATE POLICY "courses_delete_service" ON courses
    FOR DELETE 
    TO service_role
    USING (true);

-- LESSONS TABLE POLICIES
-- Allow public read access to lessons
CREATE POLICY "lessons_select_policy" ON lessons
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Block all write operations for anon users
CREATE POLICY "lessons_insert_block_anon" ON lessons
    FOR INSERT 
    TO anon
    WITH CHECK (false);

CREATE POLICY "lessons_insert_service" ON lessons
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "lessons_update_block_anon" ON lessons
    FOR UPDATE 
    TO anon
    USING (false);

CREATE POLICY "lessons_update_service" ON lessons
    FOR UPDATE 
    TO service_role
    USING (true);

CREATE POLICY "lessons_delete_block_anon" ON lessons
    FOR DELETE 
    TO anon
    USING (false);

CREATE POLICY "lessons_delete_service" ON lessons
    FOR DELETE 
    TO service_role
    USING (true);

-- USER PROFILES TABLE POLICIES
-- Allow public read access to user profiles
CREATE POLICY "user_profiles_select_policy" ON user_profiles
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Block all write operations for anon users
CREATE POLICY "user_profiles_insert_block_anon" ON user_profiles
    FOR INSERT 
    TO anon
    WITH CHECK (false);

CREATE POLICY "user_profiles_insert_service" ON user_profiles
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "user_profiles_update_block_anon" ON user_profiles
    FOR UPDATE 
    TO anon
    USING (false);

CREATE POLICY "user_profiles_update_service" ON user_profiles
    FOR UPDATE 
    TO service_role
    USING (true);

CREATE POLICY "user_profiles_delete_block_anon" ON user_profiles
    FOR DELETE 
    TO anon
    USING (false);

CREATE POLICY "user_profiles_delete_service" ON user_profiles
    FOR DELETE 
    TO service_role
    USING (true);

-- DONATIONS TABLE POLICIES
-- Allow public read access to donations
CREATE POLICY "donations_select_policy" ON donations
    FOR SELECT 
    TO anon, authenticated
    USING (true);

-- Block all write operations for anon users
CREATE POLICY "donations_insert_block_anon" ON donations
    FOR INSERT 
    TO anon
    WITH CHECK (false);

CREATE POLICY "donations_insert_service" ON donations
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "donations_update_block_anon" ON donations
    FOR UPDATE 
    TO anon
    USING (false);

CREATE POLICY "donations_update_service" ON donations
    FOR UPDATE 
    TO service_role
    USING (true);

CREATE POLICY "donations_delete_block_anon" ON donations
    FOR DELETE 
    TO anon
    USING (false);

CREATE POLICY "donations_delete_service" ON donations
    FOR DELETE 
    TO service_role
    USING (true);

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('courses', 'lessons', 'user_profiles', 'donations');
