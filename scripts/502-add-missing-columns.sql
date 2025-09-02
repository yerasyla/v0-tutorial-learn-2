-- Add missing columns to make _sol tables match original tables
-- This is additive only to avoid dependency issues

-- Add creator_wallet to courses_sol if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses_sol' AND column_name = 'creator_wallet'
    ) THEN
        ALTER TABLE courses_sol ADD COLUMN creator_wallet VARCHAR(50);
        
        -- Copy data from instructor_wallet to creator_wallet if instructor_wallet exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'courses_sol' AND column_name = 'instructor_wallet'
        ) THEN
            UPDATE courses_sol SET creator_wallet = instructor_wallet;
        END IF;
    END IF;
END $$;

-- Ensure user_profiles_sol has wallet_address column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles_sol' AND column_name = 'wallet_address'
    ) THEN
        ALTER TABLE user_profiles_sol ADD COLUMN wallet_address VARCHAR(50);
        
        -- Copy data from solana_wallet_address to wallet_address if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles_sol' AND column_name = 'solana_wallet_address'
        ) THEN
            UPDATE user_profiles_sol SET wallet_address = solana_wallet_address;
        END IF;
    END IF;
END $$;

-- Add any other missing columns that should match the original tables
-- This ensures compatibility without breaking existing dependencies
