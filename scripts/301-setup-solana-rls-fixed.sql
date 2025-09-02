-- Enable Row Level Security on Solana tables
ALTER TABLE user_profiles_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_connections_sol ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_sol ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles_sol
-- Users can read all profiles (for public display)
CREATE POLICY "Public profiles are viewable by everyone" ON user_profiles_sol
    FOR SELECT USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" ON user_profiles_sol
    FOR INSERT WITH CHECK (solana_wallet_address = current_setting('app.current_user_wallet', true));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles_sol
    FOR UPDATE USING (solana_wallet_address = current_setting('app.current_user_wallet', true));

-- RLS Policies for donations_sol
-- All donations are publicly viewable (for transparency)
CREATE POLICY "Donations are viewable by everyone" ON donations_sol
    FOR SELECT USING (true);

-- Only authenticated users can insert donations
CREATE POLICY "Authenticated users can create donations" ON donations_sol
    FOR INSERT WITH CHECK (donor_wallet_address = current_setting('app.current_user_wallet', true));

-- RLS Policies for wallet_connections_sol
-- Users can only see their own wallet connections
CREATE POLICY "Users can view own wallet connections" ON wallet_connections_sol
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles_sol 
            WHERE id = wallet_connections_sol.user_profile_id 
            AND solana_wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Users can insert their own wallet connections
CREATE POLICY "Users can insert own wallet connections" ON wallet_connections_sol
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles_sol 
            WHERE id = wallet_connections_sol.user_profile_id 
            AND solana_wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Users can update their own wallet connections
CREATE POLICY "Users can update own wallet connections" ON wallet_connections_sol
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles_sol 
            WHERE id = wallet_connections_sol.user_profile_id 
            AND solana_wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Users can delete their own wallet connections
CREATE POLICY "Users can delete own wallet connections" ON wallet_connections_sol
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles_sol 
            WHERE id = wallet_connections_sol.user_profile_id 
            AND solana_wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- RLS Policies for transactions_sol
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions" ON transactions_sol
    FOR SELECT USING (user_wallet_address = current_setting('app.current_user_wallet', true));

-- System can insert transactions (typically from API)
CREATE POLICY "System can insert transactions" ON transactions_sol
    FOR INSERT WITH CHECK (true);

-- Create helper function to set current user wallet context
CREATE OR REPLACE FUNCTION set_current_user_wallet(wallet_address TEXT)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_user_wallet', wallet_address, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_profiles_sol TO anon, authenticated;
GRANT ALL ON donations_sol TO anon, authenticated;
GRANT ALL ON wallet_connections_sol TO anon, authenticated;
GRANT ALL ON transactions_sol TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_current_user_wallet(TEXT) TO anon, authenticated;
