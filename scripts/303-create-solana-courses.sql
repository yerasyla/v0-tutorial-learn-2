-- Create Solana-specific courses and lessons tables
-- These are completely separate from the original tables

-- Courses for Solana platform
CREATE TABLE courses_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    duration_minutes INTEGER,
    price_sol DECIMAL(10, 9) DEFAULT 0, -- SOL price (supports up to 9 decimal places)
    price_lamports BIGINT DEFAULT 0, -- Price in lamports for precision
    instructor_wallet VARCHAR(50) CHECK (length(instructor_wallet) BETWEEN 32 AND 50), -- Solana wallet address
    category VARCHAR(100),
    tags TEXT[], -- Array of tags
    is_published BOOLEAN DEFAULT false,
    enrollment_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons for Solana courses
CREATE TABLE lessons_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses_sol(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT, -- Lesson content/markdown
    video_url TEXT,
    duration_minutes INTEGER,
    order_index INTEGER NOT NULL,
    is_free BOOLEAN DEFAULT false,
    prerequisites TEXT[], -- Array of prerequisite lesson IDs
    learning_objectives TEXT[], -- Array of learning objectives
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, order_index)
);

-- User progress for Solana courses
CREATE TABLE user_progress_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet VARCHAR(50) NOT NULL CHECK (length(user_wallet) BETWEEN 32 AND 50),
    course_id UUID REFERENCES courses_sol(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons_sol(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_wallet, lesson_id)
);

-- Course enrollments for Solana platform
CREATE TABLE course_enrollments_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet VARCHAR(50) NOT NULL CHECK (length(user_wallet) BETWEEN 32 AND 50),
    course_id UUID REFERENCES courses_sol(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_signature VARCHAR(88), -- Solana transaction signature
    amount_paid_lamports BIGINT DEFAULT 0,
    amount_paid_sol DECIMAL(10, 9) DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    certificate_issued BOOLEAN DEFAULT false,
    UNIQUE(user_wallet, course_id)
);

-- Create indexes for better performance
CREATE INDEX idx_courses_sol_published ON courses_sol(is_published);
CREATE INDEX idx_courses_sol_category ON courses_sol(category);
CREATE INDEX idx_courses_sol_difficulty ON courses_sol(difficulty);
CREATE INDEX idx_lessons_sol_course_order ON lessons_sol(course_id, order_index);
CREATE INDEX idx_user_progress_sol_wallet ON user_progress_sol(user_wallet);
CREATE INDEX idx_user_progress_sol_course ON user_progress_sol(course_id);
CREATE INDEX idx_course_enrollments_sol_wallet ON course_enrollments_sol(user_wallet);
CREATE INDEX idx_course_enrollments_sol_course ON course_enrollments_sol(course_id);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_sol_updated_at BEFORE UPDATE ON courses_sol FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_sol_updated_at BEFORE UPDATE ON lessons_sol FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_sol_updated_at BEFORE UPDATE ON user_progress_sol FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
