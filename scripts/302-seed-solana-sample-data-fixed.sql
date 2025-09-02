-- Insert sample Solana user profiles
INSERT INTO user_profiles_sol (
    solana_wallet_address,
    display_name,
    about_me,
    is_verified,
    created_at
) VALUES 
(
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    'Solana Developer',
    'Building the future of Web3 on Solana',
    true,
    NOW()
),
(
    'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC7Ybd4dDC8k6M',
    'DeFi Enthusiast',
    'Exploring decentralized finance on Solana',
    false,
    NOW()
),
(
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    'NFT Creator',
    'Creating unique digital art on Solana',
    true,
    NOW()
);

-- Insert sample wallet connections
INSERT INTO wallet_connections_sol (
    user_profile_id,
    wallet_address,
    wallet_type,
    is_primary
) VALUES 
(
    (SELECT id FROM user_profiles_sol WHERE solana_wallet_address = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'),
    '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    'phantom',
    true
),
(
    (SELECT id FROM user_profiles_sol WHERE solana_wallet_address = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC7Ybd4dDC8k6M'),
    'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC7Ybd4dDC8k6M',
    'solflare',
    true
);

-- Insert sample donations (only if courses exist)
DO $$
DECLARE
    sample_course_id UUID;
BEGIN
    -- Get a sample course ID if any exist
    SELECT id INTO sample_course_id FROM courses LIMIT 1;
    
    IF sample_course_id IS NOT NULL THEN
        INSERT INTO donations_sol (
            course_id,
            donor_wallet_address,
            transaction_signature,
            amount_lamports,
            amount_sol,
            confirmation_status,
            created_at,
            confirmed_at
        ) VALUES 
        (
            sample_course_id,
            '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            '5VfYmGBjyUN9nGoetqgTw7VjdmoszWIdpwBDgxMEVxRLSuHofv1yEb7SyYBj2xwrYcCjjGDiQrAiTA5VUjRVAuMXkL2',
            100000000, -- 0.1 SOL in lamports
            0.1,
            'confirmed',
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '1 day'
        ),
        (
            sample_course_id,
            'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC7Ybd4dDC8k6M',
            '3NMvgjQX4c4Wg3EPpECKnqmtanMW2snVqNkpJgfLVxeBJxnFoqiEU7k2VkpDHWy2eve2N6ffA3agCNBhEyVBVkAeP9X',
            500000000, -- 0.5 SOL in lamports
            0.5,
            'confirmed',
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '2 hours'
        );

        -- Insert corresponding transaction records
        INSERT INTO transactions_sol (
            user_wallet_address,
            transaction_signature,
            transaction_type,
            course_id,
            donation_id,
            amount_lamports,
            amount_sol,
            confirmation_status,
            created_at,
            confirmed_at
        ) VALUES 
        (
            '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            '5VfYmGBjyUN9nGoetqgTw7VjdmoszWIdpwBDgxMEVxRLSuHofv1yEb7SyYBj2xwrYcCjjGDiQrAiTA5VUjRVAuMXkL2',
            'donation',
            sample_course_id,
            (SELECT id FROM donations_sol WHERE transaction_signature = '5VfYmGBjyUN9nGoetqgTw7VjdmoszWIdpwBDgxMEVxRLSuHofv1yEb7SyYBj2xwrYcCjjGDiQrAiTA5VUjRVAuMXkL2'),
            100000000,
            0.1,
            'confirmed',
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '1 day'
        ),
        (
            'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC7Ybd4dDC8k6M',
            '3NMvgjQX4c4Wg3EPpECKnqmtanMW2snVqNkpJgfLVxeBJxnFoqiEU7k2VkpDHWy2eve2N6ffA3agCNBhEyVBVkAeP9X',
            'donation',
            sample_course_id,
            (SELECT id FROM donations_sol WHERE transaction_signature = '3NMvgjQX4c4Wg3EPpECKnqmtanMW2snVqNkpJgfLVxeBJxnFoqiEU7k2VkpDHWy2eve2N6ffA3agCNBhEyVBVkAeP9X'),
            500000000,
            0.5,
            'confirmed',
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '2 hours'
        );
    END IF;
END $$;
