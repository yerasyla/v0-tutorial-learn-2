-- Enable RLS on Solana course tables
ALTER TABLE courses_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments_sol ENABLE ROW LEVEL SECURITY;

-- Courses policies
CREATE POLICY "Anyone can view published courses" ON courses_sol
    FOR SELECT USING (is_published = true);

CREATE POLICY "Instructors can manage their courses" ON courses_sol
    FOR ALL USING (instructor_wallet = current_setting('app.current_user_wallet', true));

-- Lessons policies
CREATE POLICY "Anyone can view lessons of published courses" ON lessons_sol
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses_sol 
            WHERE courses_sol.id = lessons_sol.course_id 
            AND courses_sol.is_published = true
        )
    );

CREATE POLICY "Instructors can manage lessons of their courses" ON lessons_sol
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses_sol 
            WHERE courses_sol.id = lessons_sol.course_id 
            AND courses_sol.instructor_wallet = current_setting('app.current_user_wallet', true)
        )
    );

-- User progress policies
CREATE POLICY "Users can view their own progress" ON user_progress_sol
    FOR SELECT USING (user_wallet = current_setting('app.current_user_wallet', true));

CREATE POLICY "Users can update their own progress" ON user_progress_sol
    FOR INSERT WITH CHECK (user_wallet = current_setting('app.current_user_wallet', true));

CREATE POLICY "Users can modify their own progress" ON user_progress_sol
    FOR UPDATE USING (user_wallet = current_setting('app.current_user_wallet', true));

-- Course enrollments policies
CREATE POLICY "Users can view their own enrollments" ON course_enrollments_sol
    FOR SELECT USING (user_wallet = current_setting('app.current_user_wallet', true));

CREATE POLICY "Users can enroll themselves" ON course_enrollments_sol
    FOR INSERT WITH CHECK (user_wallet = current_setting('app.current_user_wallet', true));

CREATE POLICY "Users can update their own enrollments" ON course_enrollments_sol
    FOR UPDATE USING (user_wallet = current_setting('app.current_user_wallet', true));

-- Instructors can view enrollments for their courses
CREATE POLICY "Instructors can view course enrollments" ON course_enrollments_sol
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses_sol 
            WHERE courses_sol.id = course_enrollments_sol.course_id 
            AND courses_sol.instructor_wallet = current_setting('app.current_user_wallet', true)
        )
    );
