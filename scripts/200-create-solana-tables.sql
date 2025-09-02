-- Create Solana-specific tables alongside existing ones
-- This allows gradual migration from Ethereum to Solana wallets

-- Users table for Solana wallets
CREATE TABLE IF NOT EXISTS users_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL UNIQUE,
    username TEXT,
    email TEXT,
    avatar_url TEXT,
    twitter_handle TEXT,
    bio TEXT,
    is_verified BOOLEAN DEFAULT false,
    total_donations_received BIGINT DEFAULT 0, -- in lamports
    referral_code TEXT UNIQUE,
    referred_by UUID REFERENCES users_sol(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Link to existing user account for migration
    legacy_user_id UUID REFERENCES users(id),
    
    -- Solana wallet address validation (base58, 32-44 chars)
    CONSTRAINT valid_solana_address CHECK (
        wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    )
);

-- Donations table for SOL payments
CREATE TABLE IF NOT EXISTS donations_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_wallet TEXT NOT NULL,
    to_wallet TEXT NOT NULL,
    amount_lamports BIGINT NOT NULL, -- SOL amount in lamports
    amount_sol DECIMAL(18,9) NOT NULL, -- SOL amount for display
    transaction_signature TEXT NOT NULL UNIQUE,
    block_height BIGINT,
    course_id UUID REFERENCES courses(id),
    lesson_id UUID REFERENCES lessons(id),
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Foreign key to Solana users
    donor_id UUID REFERENCES users_sol(id),
    recipient_id UUID REFERENCES users_sol(id),
    
    -- Solana address validation
    CONSTRAINT valid_from_address CHECK (
        from_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    ),
    CONSTRAINT valid_to_address CHECK (
        to_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    ),
    -- Solana transaction signature validation (base58, ~88 chars)
    CONSTRAINT valid_signature CHECK (
        transaction_signature ~ '^[1-9A-HJ-NP-Za-km-z]{87,88}$'
    )
);

-- Wallet connections for tracking multiple wallets per user
CREATE TABLE IF NOT EXISTS wallet_connections_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users_sol(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    wallet_type TEXT NOT NULL, -- 'phantom', 'solflare', 'torus', 'ledger', etc.
    is_primary BOOLEAN DEFAULT false,
    last_connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, wallet_address),
    
    -- Solana address validation
    CONSTRAINT valid_wallet_address CHECK (
        wallet_address ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    )
);

-- Transaction history for all Solana interactions
CREATE TABLE IF NOT EXISTS transactions_sol (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users_sol(id),
    transaction_signature TEXT NOT NULL UNIQUE,
    transaction_type TEXT NOT NULL, -- 'donation', 'reward', 'referral', etc.
    from_wallet TEXT NOT NULL,
    to_wallet TEXT,
    amount_lamports BIGINT NOT NULL,
    amount_sol DECIMAL(18,9) NOT NULL,
    block_height BIGINT,
    slot BIGINT,
    fee_lamports BIGINT DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    metadata JSONB, -- Additional transaction data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Solana address validation
    CONSTRAINT valid_from_wallet CHECK (
        from_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    ),
    CONSTRAINT valid_to_wallet CHECK (
        to_wallet IS NULL OR to_wallet ~ '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
    ),
    -- Solana transaction signature validation
    CONSTRAINT valid_tx_signature CHECK (
        transaction_signature ~ '^[1-9A-HJ-NP-Za-km-z]{87,88}$'
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_sol_wallet ON users_sol(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_sol_referral ON users_sol(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_sol_legacy ON users_sol(legacy_user_id);

CREATE INDEX IF NOT EXISTS idx_donations_sol_from ON donations_sol(from_wallet);
CREATE INDEX IF NOT EXISTS idx_donations_sol_to ON donations_sol(to_wallet);
CREATE INDEX IF NOT EXISTS idx_donations_sol_signature ON donations_sol(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_donations_sol_course ON donations_sol(course_id);
CREATE INDEX IF NOT EXISTS idx_donations_sol_created ON donations_sol(created_at);

CREATE INDEX IF NOT EXISTS idx_wallet_connections_user ON wallet_connections_sol(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_connections_address ON wallet_connections_sol(wallet_address);

CREATE INDEX IF NOT EXISTS idx_transactions_sol_user ON transactions_sol(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sol_signature ON transactions_sol(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_transactions_sol_type ON transactions_sol(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_sol_created ON transactions_sol(created_at);

-- Create updated_at trigger for users_sol
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_sol_updated_at 
    BEFORE UPDATE ON users_sol 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
