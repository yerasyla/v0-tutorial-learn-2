-- Enable RLS on all SOL tables
ALTER TABLE user_profiles_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations_sol ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles_sol FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON user_profiles_sol FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON user_profiles_sol FOR UPDATE USING (wallet_address = current_setting('app.current_user_wallet', true));

-- Courses policies
CREATE POLICY "Anyone can view published courses" ON courses_sol FOR SELECT USING (is_published = true OR creator_wallet = current_setting('app.current_user_wallet', true));
CREATE POLICY "Users can create courses" ON courses_sol FOR INSERT WITH CHECK (creator_wallet = current_setting('app.current_user_wallet', true));
CREATE POLICY "Creators can update their courses" ON courses_sol FOR UPDATE USING (creator_wallet = current_setting('app.current_user_wallet', true));

-- Lessons policies
CREATE POLICY "Anyone can view lessons of published courses" ON lessons_sol FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses_sol WHERE courses_sol.id = lessons_sol.course_id AND (courses_sol.is_published = true OR courses_sol.creator_wallet = current_setting('app.current_user_wallet', true)))
);
CREATE POLICY "Course creators can manage lessons" ON lessons_sol FOR ALL USING (
    EXISTS (SELECT 1 FROM courses_sol WHERE courses_sol.id = lessons_sol.course_id AND courses_sol.creator_wallet = current_setting('app.current_user_wallet', true))
);

-- Donations policies
CREATE POLICY "Anyone can view donations" ON donations_sol FOR SELECT USING (true);
CREATE POLICY "Anyone can create donations" ON donations_sol FOR INSERT WITH CHECK (true);
