-- 𝗠𝗶𝗴𝗿𝗮𝘁𝗶𝗼𝗻: remove obsolete youtube_url column from courses
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'courses'
      AND column_name = 'youtube_url'
  ) THEN
    ALTER TABLE courses DROP COLUMN youtube_url;
  END IF;
END$$;
