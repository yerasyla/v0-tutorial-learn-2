-- Fix foreign key constraint for donations_sol table to reference courses_sol instead of courses
-- Drop the existing foreign key constraint that's pointing to the wrong table
ALTER TABLE donations_sol DROP CONSTRAINT IF EXISTS donations_sol_course_id_fkey;

-- Add the correct foreign key constraint pointing to courses_sol table
ALTER TABLE donations_sol 
ADD CONSTRAINT donations_sol_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses_sol(id) ON DELETE CASCADE;

-- Verify the constraint was created correctly
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='donations_sol'
    AND kcu.column_name='course_id';
