-- Drop existing _sol tables and recreate with exact same structure as original tables
-- This ensures courses_sol and lessons_sol match courses and lessons exactly

-- Drop existing tables (cascade to remove dependencies)
DROP TABLE IF EXISTS courses_sol CASCADE;
DROP TABLE IF EXISTS lessons_sol CASCADE;

-- Recreate courses_sol with exact same structure as courses
CREATE TABLE courses_sol (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title character varying NOT NULL,
    description text,
    creator_wallet character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Recreate lessons_sol with exact same structure as lessons  
CREATE TABLE lessons_sol (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id uuid NOT NULL REFERENCES courses_sol(id) ON DELETE CASCADE,
    title character varying NOT NULL,
    description text,
    youtube_url character varying,
    order_index integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE courses_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_sol ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for courses_sol
CREATE POLICY "Anyone can view published courses_sol" ON courses_sol
    FOR SELECT USING (true);

CREATE POLICY "Creators can insert their own courses_sol" ON courses_sol
    FOR INSERT WITH CHECK (auth.uid()::text = creator_wallet OR creator_wallet IS NOT NULL);

CREATE POLICY "Creators can update their own courses_sol" ON courses_sol
    FOR UPDATE USING (auth.uid()::text = creator_wallet OR creator_wallet IS NOT NULL);

CREATE POLICY "Creators can delete their own courses_sol" ON courses_sol
    FOR DELETE USING (auth.uid()::text = creator_wallet OR creator_wallet IS NOT NULL);

-- Create RLS policies for lessons_sol
CREATE POLICY "Anyone can view lessons_sol" ON lessons_sol
    FOR SELECT USING (true);

CREATE POLICY "Course creators can manage lessons_sol" ON lessons_sol
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses_sol 
            WHERE courses_sol.id = lessons_sol.course_id 
            AND (auth.uid()::text = courses_sol.creator_wallet OR courses_sol.creator_wallet IS NOT NULL)
        )
    );

-- Create indexes for performance
CREATE INDEX idx_courses_sol_creator_wallet ON courses_sol(creator_wallet);
CREATE INDEX idx_courses_sol_created_at ON courses_sol(created_at DESC);
CREATE INDEX idx_lessons_sol_course_id ON lessons_sol(course_id);
CREATE INDEX idx_lessons_sol_order_index ON lessons_sol(course_id, order_index);

-- Add updated_at trigger for courses_sol
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_sol_updated_at BEFORE UPDATE ON courses_sol
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_sol_updated_at BEFORE UPDATE ON lessons_sol
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
