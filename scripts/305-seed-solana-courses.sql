-- Sample Solana courses and lessons
INSERT INTO courses_sol (
    title, 
    description, 
    image_url, 
    difficulty, 
    duration_minutes, 
    price_sol, 
    price_lamports, 
    instructor_wallet, 
    category, 
    tags, 
    is_published,
    rating
) VALUES 
(
    'Solana Fundamentals', 
    'Learn the basics of Solana blockchain, wallets, and transactions', 
    '/placeholder.svg?height=300&width=400', 
    'beginner', 
    180, 
    0.1, 
    100000000, 
    'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC7Aub8Gh5Pump', 
    'Blockchain Basics', 
    ARRAY['solana', 'blockchain', 'fundamentals', 'beginner'], 
    true,
    4.8
),
(
    'Solana DeFi Development', 
    'Build decentralized finance applications on Solana', 
    '/placeholder.svg?height=300&width=400', 
    'advanced', 
    360, 
    0.5, 
    500000000, 
    'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC7Aub8Gh5Pump', 
    'DeFi Development', 
    ARRAY['solana', 'defi', 'development', 'advanced'], 
    true,
    4.9
),
(
    'NFT Creation on Solana', 
    'Create and deploy NFT collections on the Solana blockchain', 
    '/placeholder.svg?height=300&width=400', 
    'intermediate', 
    240, 
    0.25, 
    250000000, 
    'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC7Aub8Gh5Pump', 
    'NFT Development', 
    ARRAY['solana', 'nft', 'metaplex', 'intermediate'], 
    true,
    4.7
);

-- Sample lessons for Solana Fundamentals course
INSERT INTO lessons_sol (
    course_id, 
    title, 
    description, 
    content, 
    duration_minutes, 
    order_index, 
    is_free, 
    learning_objectives
) VALUES 
(
    (SELECT id FROM courses_sol WHERE title = 'Solana Fundamentals' LIMIT 1),
    'Introduction to Solana',
    'Overview of Solana blockchain and its key features',
    '# Introduction to Solana\n\nSolana is a high-performance blockchain that supports smart contracts and decentralized applications...',
    30,
    1,
    true,
    ARRAY['Understand what Solana is', 'Learn about Solana''s key features', 'Compare Solana to other blockchains']
),
(
    (SELECT id FROM courses_sol WHERE title = 'Solana Fundamentals' LIMIT 1),
    'Setting Up Your Solana Wallet',
    'Learn how to create and secure your Solana wallet',
    '# Setting Up Your Solana Wallet\n\nIn this lesson, you''ll learn how to set up a Solana wallet...',
    45,
    2,
    true,
    ARRAY['Create a Solana wallet', 'Understand wallet security', 'Connect wallet to dApps']
),
(
    (SELECT id FROM courses_sol WHERE title = 'Solana Fundamentals' LIMIT 1),
    'Understanding SOL and Lamports',
    'Learn about Solana''s native currency and transaction fees',
    '# Understanding SOL and Lamports\n\nSOL is the native cryptocurrency of Solana...',
    30,
    3,
    false,
    ARRAY['Understand SOL token', 'Learn about lamports', 'Calculate transaction fees']
);

-- Sample lessons for DeFi Development course
INSERT INTO lessons_sol (
    course_id, 
    title, 
    description, 
    content, 
    duration_minutes, 
    order_index, 
    is_free, 
    learning_objectives
) VALUES 
(
    (SELECT id FROM courses_sol WHERE title = 'Solana DeFi Development' LIMIT 1),
    'DeFi Protocols Overview',
    'Understanding decentralized finance on Solana',
    '# DeFi Protocols Overview\n\nDecentralized Finance (DeFi) on Solana offers unique advantages...',
    60,
    1,
    true,
    ARRAY['Understand DeFi concepts', 'Learn about Solana DeFi ecosystem', 'Explore major protocols']
),
(
    (SELECT id FROM courses_sol WHERE title = 'Solana DeFi Development' LIMIT 1),
    'Building a Token Swap',
    'Create a decentralized exchange interface',
    '# Building a Token Swap\n\nIn this lesson, we''ll build a token swap interface...',
    90,
    2,
    false,
    ARRAY['Build swap interface', 'Integrate with Jupiter', 'Handle slippage and fees']
);
