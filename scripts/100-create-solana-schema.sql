-- Drop existing tables to recreate with Solana-compatible structure
DROP TABLE IF EXISTS donations CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;

-- Create courses table with Solana wallet addresses
CREATE TABLE courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  youtube_url VARCHAR(500) NOT NULL,
  creator_wallet VARCHAR(50) NOT NULL, -- Updated for Solana base58 addresses (32-44 chars)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add Solana-specific validation
  CONSTRAINT valid_solana_wallet CHECK (
    LENGTH(creator_wallet) >= 32 AND LENGTH(creator_wallet) <= 50 AND
    creator_wallet ~ '^[1-9A-HJ-NP-Za-km-z]+$' -- Base58 validation
  )
);

-- Create lessons table
CREATE TABLE lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  youtube_url VARCHAR(500) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  creator_wallet VARCHAR(50) NOT NULL, -- Updated for Solana addresses
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add Solana-specific validation
  CONSTRAINT valid_lesson_solana_wallet CHECK (
    LENGTH(creator_wallet) >= 32 AND LENGTH(creator_wallet) <= 50 AND
    creator_wallet ~ '^[1-9A-HJ-NP-Za-km-z]+$'
  )
);

-- Create user profiles table for Solana wallets
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address VARCHAR(50) NOT NULL UNIQUE, -- Updated for Solana addresses
  username VARCHAR(50),
  bio TEXT,
  avatar_url TEXT,
  twitter_handle VARCHAR(50),
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add Solana-specific validation
  CONSTRAINT valid_profile_solana_wallet CHECK (
    LENGTH(wallet_address) >= 32 AND LENGTH(wallet_address) <= 50 AND
    wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]+$'
  )
);

-- Create donations table with SOL support
CREATE TABLE donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  donor_wallet VARCHAR(50) NOT NULL, -- Updated for Solana addresses
  recipient_wallet VARCHAR(50) NOT NULL, -- Added recipient wallet
  amount_sol DECIMAL(18,9) NOT NULL, -- SOL amount with 9 decimal precision
  amount_lamports BIGINT NOT NULL, -- Amount in lamports (1 SOL = 1B lamports)
  tx_signature VARCHAR(100) NOT NULL UNIQUE, -- Solana transaction signature (base58, ~87-88 chars)
  block_height BIGINT, -- Solana block height for verification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add Solana-specific validation
  CONSTRAINT valid_donor_solana_wallet CHECK (
    LENGTH(donor_wallet) >= 32 AND LENGTH(donor_wallet) <= 50 AND
    donor_wallet ~ '^[1-9A-HJ-NP-Za-km-z]+$'
  ),
  CONSTRAINT valid_recipient_solana_wallet CHECK (
    LENGTH(recipient_wallet) >= 32 AND LENGTH(recipient_wallet) <= 50 AND
    recipient_wallet ~ '^[1-9A-HJ-NP-Za-km-z]+$'
  ),
  CONSTRAINT valid_solana_signature CHECK (
    LENGTH(tx_signature) >= 80 AND LENGTH(tx_signature) <= 100 AND
    tx_signature ~ '^[1-9A-HJ-NP-Za-km-z]+$'
  ),
  CONSTRAINT positive_amount CHECK (amount_sol > 0 AND amount_lamports > 0),
  CONSTRAINT lamports_conversion CHECK (amount_lamports = (amount_sol * 1000000000)::BIGINT)
);

-- Create indexes for better performance
CREATE INDEX idx_courses_creator_wallet ON courses(creator_wallet);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);

CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_creator_wallet ON lessons(creator_wallet);
CREATE INDEX idx_lessons_order ON lessons(course_id, order_index);

CREATE INDEX idx_user_profiles_wallet ON user_profiles(wallet_address);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

CREATE INDEX idx_donations_course_id ON donations(course_id);
CREATE INDEX idx_donations_donor_wallet ON donations(donor_wallet);
CREATE INDEX idx_donations_recipient_wallet ON donations(recipient_wallet);
CREATE INDEX idx_donations_tx_signature ON donations(tx_signature);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);
CREATE INDEX idx_donations_block_height ON donations(block_height);

-- Enable Row Level Security
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
