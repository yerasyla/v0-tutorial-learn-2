-- Drop all existing policies and start fresh
DROP POLICY IF EXISTS "courses_select_policy" ON courses;
DROP POLICY IF EXISTS "courses_insert_policy" ON courses;
DROP POLICY IF EXISTS "courses_update_policy" ON courses;
DROP POLICY IF EXISTS "courses_delete_policy" ON courses;
DROP POLICY IF EXISTS "courses_insert_block_anon" ON courses;
DROP POLICY IF EXISTS "courses_insert_service" ON courses;
DROP POLICY IF EXISTS "courses_update_block_anon" ON courses;
DROP POLICY IF EXISTS "courses_update_service" ON courses;
DROP POLICY IF EXISTS "courses_delete_block_anon" ON courses;
DROP POLICY IF EXISTS "courses_delete_service" ON courses;

DROP POLICY IF EXISTS "lessons_select_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_update_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_block_anon" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_service" ON lessons;
DROP POLICY IF EXISTS "lessons_update_block_anon" ON lessons;
DROP POLICY IF EXISTS "lessons_update_service" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_block_anon" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_service" ON lessons;

DROP POLICY IF EXISTS "user_profiles_select_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_block_anon" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_service" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_block_anon" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_service" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_block_anon" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_service" ON user_profiles;

DROP POLICY IF EXISTS "donations_select_policy" ON donations;
DROP POLICY IF EXISTS "donations_insert_policy" ON donations;
DROP POLICY IF EXISTS "donations_update_policy" ON donations;
DROP POLICY IF EXISTS "donations_delete_policy" ON donations;
DROP POLICY IF EXISTS "donations_insert_block_anon" ON donations;
DROP POLICY IF EXISTS "donations_insert_service" ON donations;
DROP POLICY IF EXISTS "donations_update_block_anon" ON donations;
DROP POLICY IF EXISTS "donations_update_service" ON donations;
DROP POLICY IF EXISTS "donations_delete_block_anon" ON donations;
DROP POLICY IF EXISTS "donations_delete_service" ON donations;

-- Disable RLS temporarily
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE donations DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- COURSES TABLE - STRICT POLICIES
-- Allow public read access
CREATE POLICY "courses_public_read" ON courses
    FOR SELECT 
    USING (true);

-- COMPLETELY BLOCK all write operations for anon role
CREATE POLICY "courses_block_anon_insert" ON courses
    FOR INSERT 
    TO anon
    WITH CHECK (false);

CREATE POLICY "courses_block_anon_update" ON courses
    FOR UPDATE 
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY "courses_block_anon_delete" ON courses
    FOR DELETE 
    TO anon
    USING (false);

-- Only allow service_role to write
CREATE POLICY "courses_service_insert" ON courses
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "courses_service_update" ON courses
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "courses_service_delete" ON courses
    FOR DELETE 
    TO service_role
    USING (true);

-- LESSONS TABLE - STRICT POLICIES
-- Allow public read access
CREATE POLICY "lessons_public_read" ON lessons
    FOR SELECT 
    USING (true);

-- COMPLETELY BLOCK all write operations for anon role
CREATE POLICY "lessons_block_anon_insert" ON lessons
    FOR INSERT 
    TO anon
    WITH CHECK (false);

CREATE POLICY "lessons_block_anon_update" ON lessons
    FOR UPDATE 
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY "lessons_block_anon_delete" ON lessons
    FOR DELETE 
    TO anon
    USING (false);

-- Only allow service_role to write
CREATE POLICY "lessons_service_insert" ON lessons
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "lessons_service_update" ON lessons
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "lessons_service_delete" ON lessons
    FOR DELETE 
    TO service_role
    USING (true);

-- USER_PROFILES TABLE - STRICT POLICIES
-- Allow public read access
CREATE POLICY "user_profiles_public_read" ON user_profiles
    FOR SELECT 
    USING (true);

-- COMPLETELY BLOCK all write operations for anon role
CREATE POLICY "user_profiles_block_anon_insert" ON user_profiles
    FOR INSERT 
    TO anon
    WITH CHECK (false);

CREATE POLICY "user_profiles_block_anon_update" ON user_profiles
    FOR UPDATE 
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY "user_profiles_block_anon_delete" ON user_profiles
    FOR DELETE 
    TO anon
    USING (false);

-- Only allow service_role to write
CREATE POLICY "user_profiles_service_insert" ON user_profiles
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "user_profiles_service_update" ON user_profiles
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "user_profiles_service_delete" ON user_profiles
    FOR DELETE 
    TO service_role
    USING (true);

-- DONATIONS TABLE - STRICT POLICIES
-- Allow public read access
CREATE POLICY "donations_public_read" ON donations
    FOR SELECT 
    USING (true);

-- COMPLETELY BLOCK all write operations for anon role
CREATE POLICY "donations_block_anon_insert" ON donations
    FOR INSERT 
    TO anon
    WITH CHECK (false);

CREATE POLICY "donations_block_anon_update" ON donations
    FOR UPDATE 
    TO anon
    USING (false)
    WITH CHECK (false);

CREATE POLICY "donations_block_anon_delete" ON donations
    FOR DELETE 
    TO anon
    USING (false);

-- Only allow service_role to write
CREATE POLICY "donations_service_insert" ON donations
    FOR INSERT 
    TO service_role
    WITH CHECK (true);

CREATE POLICY "donations_service_update" ON donations
    FOR UPDATE 
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "donations_service_delete" ON donations
    FOR DELETE 
    TO service_role
    USING (true);

-- Verify RLS is enabled and policies are active
SELECT 
    schemaname, 
    tablename, 
    rowsecurity,
    (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE tablename IN ('courses', 'lessons', 'user_profiles', 'donations')
ORDER BY tablename;

-- Show all policies for verification
SELECT 
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('courses', 'lessons', 'user_profiles', 'donations')
ORDER BY tablename, policyname;
