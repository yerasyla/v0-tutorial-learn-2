-- First, let's create a more secure RLS setup

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Anyone can insert courses" ON courses;
DROP POLICY IF EXISTS "Anyone can update courses" ON courses;
DROP POLICY IF EXISTS "Anyone can delete courses" ON courses;
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can update lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can delete lessons" ON lessons;

-- Create a function to get the current wallet address from the request headers
CREATE OR REPLACE FUNCTION get_current_wallet()
RETURNS TEXT AS $$
BEGIN
  -- This will be set by our middleware/API
  RETURN current_setting('request.jwt.claims', true)::json->>'wallet_address';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User Profiles RLS Policies
-- Anyone can view profiles (for public creator pages)
CREATE POLICY "Anyone can view profiles" ON user_profiles
    FOR SELECT USING (true);

-- Users can only insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (
        wallet_address = LOWER(get_current_wallet())
    );

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (
        wallet_address = LOWER(get_current_wallet())
    );

-- Courses RLS Policies
-- Anyone can view courses (for public course browsing)
CREATE POLICY "Anyone can view courses" ON courses
    FOR SELECT USING (true);

-- Users can only create courses with their wallet as creator
CREATE POLICY "Users can create own courses" ON courses
    FOR INSERT WITH CHECK (
        creator_wallet = LOWER(get_current_wallet())
    );

-- Users can only update their own courses
CREATE POLICY "Users can update own courses" ON courses
    FOR UPDATE USING (
        creator_wallet = LOWER(get_current_wallet())
    );

-- Users can only delete their own courses
CREATE POLICY "Users can delete own courses" ON courses
    FOR DELETE USING (
        creator_wallet = LOWER(get_current_wallet())
    );

-- Lessons RLS Policies
-- Anyone can view lessons (for public course viewing)
CREATE POLICY "Anyone can view lessons" ON lessons
    FOR SELECT USING (true);

-- Users can only create lessons for their own courses
CREATE POLICY "Users can create lessons for own courses" ON lessons
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = lessons.course_id 
            AND courses.creator_wallet = LOWER(get_current_wallet())
        )
    );

-- Users can only update lessons for their own courses
CREATE POLICY "Users can update lessons for own courses" ON lessons
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = lessons.course_id 
            AND courses.creator_wallet = LOWER(get_current_wallet())
        )
    );

-- Users can only delete lessons for their own courses
CREATE POLICY "Users can delete lessons for own courses" ON lessons
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = lessons.course_id 
            AND courses.creator_wallet = LOWER(get_current_wallet())
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_creator_wallet ON courses(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
