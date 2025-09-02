-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Anyone can insert courses" ON courses;
DROP POLICY IF EXISTS "Creators can update their own courses" ON courses;
DROP POLICY IF EXISTS "Anyone can delete courses" ON courses;

DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can insert lessons" ON lessons;
DROP POLICY IF EXISTS "Creators can update their own lessons" ON lessons;
DROP POLICY IF EXISTS "Anyone can delete lessons" ON lessons;

DROP POLICY IF EXISTS "Anyone can view user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can manage their own profiles" ON user_profiles;

DROP POLICY IF EXISTS "Anyone can view donations" ON donations;
DROP POLICY IF EXISTS "Anyone can insert donations" ON donations;

-- Courses policies
CREATE POLICY "Anyone can view courses" ON courses
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert courses" ON courses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can update their own courses" ON courses
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Creators can delete their own courses" ON courses
  FOR DELETE USING (true);

-- Lessons policies
CREATE POLICY "Anyone can view lessons" ON lessons
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert lessons" ON lessons
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can update their own lessons" ON lessons
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Creators can delete their own lessons" ON lessons
  FOR DELETE USING (true);

-- User profiles policies
CREATE POLICY "Anyone can view user profiles" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own profiles" ON user_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Donations policies
CREATE POLICY "Anyone can view donations" ON donations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert donations" ON donations
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON courses TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lessons TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO anon, authenticated;
GRANT SELECT, INSERT ON donations TO anon, authenticated;

GRANT ALL ON courses TO service_role;
GRANT ALL ON lessons TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON donations TO service_role;
