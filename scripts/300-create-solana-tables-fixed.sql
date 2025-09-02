-- Create Solana-specific tables that work with existing schema
-- These tables will coexist with existing tables for gradual migration

-- Solana user profiles (extends existing user_profiles)
CREATE TABLE IF NOT EXISTS user_profiles_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Link to existing user profile for migration
    legacy_profile_id UUID REFERENCES user_profiles(id),
    -- Solana wallet address (base58 encoded, 32-50 chars)
    solana_wallet_address VARCHAR(50) NOT NULL UNIQUE,
    -- Solana-specific fields
    display_name VARCHAR(100),
    avatar_url TEXT,
    about_me TEXT,
    website_url VARCHAR(255),
    twitter_handle VARCHAR(50),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    -- Session management for Solana auth
    session_token TEXT,
    session_expires_at TIMESTAMP WITH TIME ZONE,
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT valid_solana_address CHECK (
        solana_wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,50}$'
    ),
    CONSTRAINT valid_twitter_handle CHECK (
        twitter_handle IS NULL OR twitter_handle ~ '^[A-Za-z0-9_]{1,15}$'
    )
);

-- Solana donations (SOL-based)
CREATE TABLE IF NOT EXISTS donations_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    donor_wallet_address VARCHAR(50) NOT NULL,
    -- Solana transaction details
    transaction_signature VARCHAR(88) NOT NULL UNIQUE, -- Solana signatures are base58, ~88 chars
    amount_lamports BIGINT NOT NULL, -- Amount in lamports (1 SOL = 1,000,000,000 lamports)
    amount_sol DECIMAL(20,9) NOT NULL, -- Amount in SOL for easy display
    -- Transaction metadata
    block_height BIGINT,
    slot BIGINT,
    confirmation_status VARCHAR(20) DEFAULT 'pending',
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    -- Constraints
    CONSTRAINT valid_solana_donor_address CHECK (
        donor_wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,50}$'
    ),
    CONSTRAINT valid_signature CHECK (
        transaction_signature ~ '^[1-9A-HJ-NP-Za-km-z]{87,88}$'
    ),
    CONSTRAINT positive_amount CHECK (amount_lamports > 0),
    CONSTRAINT valid_confirmation_status CHECK (
        confirmation_status IN ('pending', 'confirmed', 'finalized', 'failed')
    )
);

-- Solana wallet connections (for multi-wallet support)
CREATE TABLE IF NOT EXISTS wallet_connections_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES user_profiles_sol(id) ON DELETE CASCADE,
    wallet_address VARCHAR(50) NOT NULL,
    wallet_type VARCHAR(20) NOT NULL, -- phantom, solflare, torus, ledger, etc.
    is_primary BOOLEAN DEFAULT FALSE,
    last_connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints
    CONSTRAINT valid_wallet_address CHECK (
        wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,50}$'
    ),
    CONSTRAINT valid_wallet_type CHECK (
        wallet_type IN ('phantom', 'solflare', 'torus', 'ledger', 'sollet', 'mathwallet', 'coin98', 'slope', 'trust')
    ),
    -- Unique constraint to prevent duplicate wallet connections
    UNIQUE(user_profile_id, wallet_address)
);

-- Solana transaction history (comprehensive tracking)
CREATE TABLE IF NOT EXISTS transactions_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet_address VARCHAR(50) NOT NULL,
    transaction_signature VARCHAR(88) NOT NULL UNIQUE,
    transaction_type VARCHAR(20) NOT NULL, -- donation, tip, payment, etc.
    -- Related entities
    course_id UUID REFERENCES courses(id),
    donation_id UUID REFERENCES donations_sol(id),
    -- Transaction details
    amount_lamports BIGINT NOT NULL,
    amount_sol DECIMAL(20,9) NOT NULL,
    fee_lamports BIGINT DEFAULT 0,
    -- Solana network details
    block_height BIGINT,
    slot BIGINT,
    confirmation_status VARCHAR(20) DEFAULT 'pending',
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    -- Constraints
    CONSTRAINT valid_user_wallet CHECK (
        user_wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,50}$'
    ),
    CONSTRAINT valid_tx_signature CHECK (
        transaction_signature ~ '^[1-9A-HJ-NP-Za-km-z]{87,88}$'
    ),
    CONSTRAINT valid_tx_type CHECK (
        transaction_type IN ('donation', 'tip', 'payment', 'reward', 'refund')
    ),
    CONSTRAINT valid_tx_confirmation_status CHECK (
        confirmation_status IN ('pending', 'confirmed', 'finalized', 'failed')
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_sol_wallet ON user_profiles_sol(solana_wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_profiles_sol_legacy ON user_profiles_sol(legacy_profile_id);
CREATE INDEX IF NOT EXISTS idx_donations_sol_course ON donations_sol(course_id);
CREATE INDEX IF NOT EXISTS idx_donations_sol_donor ON donations_sol(donor_wallet_address);
CREATE INDEX IF NOT EXISTS idx_donations_sol_created ON donations_sol(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_connections_sol_user ON wallet_connections_sol(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_wallet_connections_sol_wallet ON wallet_connections_sol(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_sol_user ON transactions_sol(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_sol_course ON transactions_sol(course_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sol_created ON transactions_sol(created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_sol_updated_at 
    BEFORE UPDATE ON user_profiles_sol 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
