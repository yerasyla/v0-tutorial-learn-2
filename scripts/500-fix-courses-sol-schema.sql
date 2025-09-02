-- Fix courses_sol table to match original courses table exactly
-- The user wants _sol tables to have exact same properties as non-SOL tables

-- First, rename instructor_wallet to creator_wallet to match original courses table
ALTER TABLE courses_sol RENAME COLUMN instructor_wallet TO creator_wallet;

-- Remove extra columns that don't exist in original courses table
ALTER TABLE courses_sol DROP COLUMN IF EXISTS price_sol;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS difficulty;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS image_url;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS category;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS tags;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS price_lamports;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS is_published;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS enrollment_count;
ALTER TABLE courses_sol DROP COLUMN IF EXISTS rating;

-- Now courses_sol should have exactly the same columns as courses:
-- - id: uuid
-- - title: character varying  
-- - description: text
-- - creator_wallet: character varying
-- - created_at: timestamp with time zone
-- - updated_at: timestamp with time zone

-- Verify the structure matches
COMMENT ON TABLE courses_sol IS 'Solana version of courses table with identical schema to original courses table';
