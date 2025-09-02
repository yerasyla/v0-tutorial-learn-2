-- Fix lessons_sol table to match original lessons table exactly

-- Remove extra columns that don't exist in original lessons table
ALTER TABLE lessons_sol DROP COLUMN IF EXISTS learning_objectives;
ALTER TABLE lessons_sol DROP COLUMN IF EXISTS duration_minutes;
ALTER TABLE lessons_sol DROP COLUMN IF EXISTS is_free;
ALTER TABLE lessons_sol DROP COLUMN IF EXISTS prerequisites;
ALTER TABLE lessons_sol DROP COLUMN IF EXISTS video_url;
ALTER TABLE lessons_sol DROP COLUMN IF EXISTS content;

-- Add missing column that exists in original lessons table
ALTER TABLE lessons_sol ADD COLUMN IF NOT EXISTS youtube_url character varying;

-- Now lessons_sol should have exactly the same columns as lessons:
-- - id: uuid
-- - title: character varying
-- - description: text
-- - course_id: uuid
-- - order_index: integer
-- - youtube_url: character varying
-- - created_at: timestamp with time zone
-- - updated_at: timestamp with time zone

COMMENT ON TABLE lessons_sol IS 'Solana version of lessons table with identical schema to original lessons table';
