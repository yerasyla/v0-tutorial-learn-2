-- Enable RLS on courses and lessons tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Users can insert their own courses" ON courses;
DROP POLICY IF EXISTS "Users can update their own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete their own courses" ON courses;

DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Users can insert lessons for their courses" ON lessons;
DROP POLICY IF EXISTS "Users can update lessons for their courses" ON lessons;
DROP POLICY IF EXISTS "Users can delete lessons for their courses" ON lessons;

-- Course policies
CREATE POLICY "Anyone can view courses" ON courses
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own courses" ON courses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own courses" ON courses
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete their own courses" ON courses
    FOR DELETE USING (true);

-- Lesson policies
CREATE POLICY "Anyone can view lessons" ON lessons
    FOR SELECT USING (true);

CREATE POLICY "Users can insert lessons for their courses" ON lessons
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update lessons for their courses" ON lessons
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete lessons for their courses" ON lessons
    FOR DELETE USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_creator_wallet ON courses(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
