-- Sample data for testing Solana integration
-- Insert sample Solana users
INSERT INTO users_sol (wallet_address, username, email, bio, is_verified, referral_code) VALUES
('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', 'solana_dev', 'dev@solana.com', 'Solana developer and educator', true, 'SOLDEV123'),
('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'phantom_user', 'user@phantom.app', 'Learning Solana development', false, 'PHANTOM456'),
('5dSHdqZaPH64VCHHyJBWpzJeepMaNa9x2GWESdNr4y6N', 'solflare_learner', 'learner@solflare.com', 'New to Web3 and Solana', false, 'SOLFLARE789')
ON CONFLICT (wallet_address) DO NOTHING;

-- Insert sample wallet connections
INSERT INTO wallet_connections_sol (user_id, wallet_address, wallet_type, is_primary) 
SELECT 
    u.id, 
    u.wallet_address, 
    CASE 
        WHEN u.username = 'phantom_user' THEN 'phantom'
        WHEN u.username = 'solflare_learner' THEN 'solflare'
        ELSE 'phantom'
    END,
    true
FROM users_sol u
ON CONFLICT (user_id, wallet_address) DO NOTHING;

-- Insert sample donations (using realistic Solana transaction signatures)
INSERT INTO donations_sol (
    from_wallet, 
    to_wallet, 
    amount_lamports, 
    amount_sol, 
    transaction_signature, 
    block_height,
    course_id,
    message,
    status,
    donor_id,
    recipient_id,
    confirmed_at
) 
SELECT 
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    100000000, -- 0.1 SOL in lamports
    0.1,
    '5VfYmGBjyUN9nGoetqgTw7VjdwpJAoE9jGhABkmJRCGxN3KwFgYBVaCQJ3BoeNvTgzYAidfqT2o1kwpps48txgYW',
    150000000,
    c.id,
    'Great course! Thanks for teaching Solana development.',
    'confirmed',
    u1.id,
    u2.id,
    NOW() - INTERVAL '1 hour'
FROM users_sol u1, users_sol u2, courses c
WHERE u1.username = 'phantom_user' 
AND u2.username = 'solana_dev'
AND c.title ILIKE '%solana%'
LIMIT 1
ON CONFLICT (transaction_signature) DO NOTHING;

-- Insert sample transaction history
INSERT INTO transactions_sol (
    user_id,
    transaction_signature,
    transaction_type,
    from_wallet,
    to_wallet,
    amount_lamports,
    amount_sol,
    block_height,
    slot,
    fee_lamports,
    status,
    metadata,
    confirmed_at
) VALUES
(
    (SELECT id FROM users_sol WHERE username = 'phantom_user'),
    '5VfYmGBjyUN9nGoetqgTw7VjdwpJAoE9jGhABkmJRCGxN3KwFgYBVaCQJ3BoeNvTgzYAidfqT2o1kwpps48txgYW',
    'donation',
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    100000000,
    0.1,
    150000000,
    150000001,
    5000, -- 0.000005 SOL fee
    'confirmed',
    '{"course_title": "Solana Development Basics", "message": "Great course!"}',
    NOW() - INTERVAL '1 hour'
)
ON CONFLICT (transaction_signature) DO NOTHING;
