-- Create simplified SOL tables that mirror the original tables exactly
-- Only 4 tables: courses_sol, lessons_sol, user_profiles_sol, donations_sol

-- Drop existing complex tables if they exist
DROP TABLE IF EXISTS transactions_sol CASCADE;
DROP TABLE IF EXISTS wallet_connections_sol CASCADE;
DROP TABLE IF EXISTS course_enrollments_sol CASCADE;
DROP TABLE IF EXISTS user_progress_sol CASCADE;

-- Create user_profiles_sol (mirrors user_profiles)
CREATE TABLE IF NOT EXISTS user_profiles_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    twitter_handle TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Solana wallet address validation
    CONSTRAINT valid_solana_address CHECK (
        wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    )
);

-- Create courses_sol (mirrors courses)
CREATE TABLE IF NOT EXISTS courses_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    creator_wallet TEXT NOT NULL,
    price_sol DECIMAL(10,9) DEFAULT 0, -- SOL price instead of TUT
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Solana wallet address validation
    CONSTRAINT valid_creator_solana_address CHECK (
        creator_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    )
);

-- Create lessons_sol (mirrors lessons)
CREATE TABLE IF NOT EXISTS lessons_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses_sol(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    video_url TEXT,
    order_index INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create donations_sol (mirrors donations)
CREATE TABLE IF NOT EXISTS donations_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses_sol(id) ON DELETE CASCADE,
    donor_wallet TEXT NOT NULL,
    amount_sol DECIMAL(10,9) NOT NULL, -- SOL amount instead of TUT
    transaction_signature TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Solana wallet address validation
    CONSTRAINT valid_donor_solana_address CHECK (
        donor_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    ),
    -- Solana transaction signature validation (base58, ~87-88 chars)
    CONSTRAINT valid_solana_signature CHECK (
        transaction_signature IS NULL OR 
        transaction_signature ~ '^[1-9A-HJ-NP-Za-km-z]{87,88}$'
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_sol_creator ON courses_sol(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_lessons_sol_course ON lessons_sol(course_id);
CREATE INDEX IF NOT EXISTS idx_donations_sol_course ON donations_sol(course_id);
CREATE INDEX IF NOT EXISTS idx_donations_sol_donor ON donations_sol(donor_wallet);
