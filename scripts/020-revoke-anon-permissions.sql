-- First, let's see what permissions the anon role currently has
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE grantee = 'anon' 
AND table_name IN ('courses', 'lessons', 'user_profiles', 'donations');

-- Revoke ALL write permissions from anon role
REVOKE INSERT, UPDATE, DELETE ON courses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON lessons FROM anon;
REVOKE INSERT, UPDATE, DELETE ON user_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON donations FROM anon;

-- Keep only SELECT permission for anon role
GRANT SELECT ON courses TO anon;
GRANT SELECT ON lessons TO anon;
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON donations TO anon;

-- Ensure service_role has full permissions
GRANT ALL ON courses TO service_role;
GRANT ALL ON lessons TO service_role;
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON donations TO service_role;

-- Also revoke permissions on sequences if they exist
REVOKE USAGE ON ALL SEQUENCES IN SCHEMA public FROM anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Verify the permissions after changes
SELECT 
    grantee, 
    table_name, 
    privilege_type 
FROM information_schema.table_privileges 
WHERE grantee IN ('anon', 'service_role')
AND table_name IN ('courses', 'lessons', 'user_profiles', 'donations')
ORDER BY grantee, table_name, privilege_type;
