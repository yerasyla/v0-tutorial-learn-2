-- Row Level Security policies for Solana tables
-- Enable RLS on all Solana tables
ALTER TABLE users_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_connections_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_sol ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile and public profiles
CREATE POLICY "Users can view public profiles" ON users_sol
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users_sol
    FOR UPDATE USING (wallet_address = current_setting('app.current_wallet', true));

CREATE POLICY "Users can insert own profile" ON users_sol
    FOR INSERT WITH CHECK (wallet_address = current_setting('app.current_wallet', true));

-- Donations are publicly readable but only insertable by the sender
CREATE POLICY "Donations are publicly readable" ON donations_sol
    FOR SELECT USING (true);

CREATE POLICY "Users can create donations from their wallet" ON donations_sol
    FOR INSERT WITH CHECK (from_wallet = current_setting('app.current_wallet', true));

-- Wallet connections are private to the user
CREATE POLICY "Users can manage own wallet connections" ON wallet_connections_sol
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users_sol 
            WHERE users_sol.id = wallet_connections_sol.user_id 
            AND users_sol.wallet_address = current_setting('app.current_wallet', true)
        )
    );

-- Transactions are readable by involved parties
CREATE POLICY "Users can view own transactions" ON transactions_sol
    FOR SELECT USING (
        from_wallet = current_setting('app.current_wallet', true) OR
        to_wallet = current_setting('app.current_wallet', true) OR
        EXISTS (
            SELECT 1 FROM users_sol 
            WHERE users_sol.id = transactions_sol.user_id 
            AND users_sol.wallet_address = current_setting('app.current_wallet', true)
        )
    );

CREATE POLICY "Users can insert own transactions" ON transactions_sol
    FOR INSERT WITH CHECK (
        from_wallet = current_setting('app.current_wallet', true) OR
        EXISTS (
            SELECT 1 FROM users_sol 
            WHERE users_sol.id = transactions_sol.user_id 
            AND users_sol.wallet_address = current_setting('app.current_wallet', true)
        )
    );

-- Helper function to set current wallet context
CREATE OR REPLACE FUNCTION set_current_wallet(wallet_addr TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_wallet', wallet_addr, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
