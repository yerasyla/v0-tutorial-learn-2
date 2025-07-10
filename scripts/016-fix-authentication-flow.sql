-- Drop the complex RLS setup and create a simpler, working one
DROP POLICY IF EXISTS "Anyone can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
DROP POLICY IF EXISTS "Users can create own courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;
DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
DROP POLICY IF EXISTS "Users can create lessons for own courses" ON lessons;
DROP POLICY IF EXISTS "Users can update lessons for own courses" ON lessons;
DROP POLICY IF EXISTS "Users can delete lessons for own courses" ON lessons;

-- Drop existing RLS policies that might be interfering
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all courses" ON courses;
DROP POLICY IF EXISTS "Users can manage own courses" ON courses;
DROP POLICY IF EXISTS "Users can view all lessons" ON lessons;
DROP POLICY IF EXISTS "Users can manage lessons for own courses" ON lessons;

-- Drop the complex functions
DROP FUNCTION IF EXISTS get_current_wallet();
DROP FUNCTION IF EXISTS set_wallet_context(TEXT);

-- Create simple, working RLS policies
-- User Profiles - anyone can view, but only service role can modify (we'll handle auth in app)
CREATE POLICY "Allow service role full access" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON user_profiles
  FOR SELECT USING (true);

-- Courses - anyone can view, service role can manage
CREATE POLICY "Allow service role full access" ON courses
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON courses
  FOR SELECT USING (true);

-- Lessons - anyone can view, service role can manage
CREATE POLICY "Allow service role full access" ON lessons
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON lessons
  FOR SELECT USING (true);

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
