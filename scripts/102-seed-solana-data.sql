-- Insert sample Solana courses with valid base58 addresses
INSERT INTO courses (title, description, youtube_url, creator_wallet) VALUES
(
  'Solana Development Fundamentals',
  'Learn the basics of building on Solana blockchain with Rust and Anchor framework',
  'https://www.youtube.com/watch?v=example1',
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
),
(
  'Building DeFi on Solana',
  'Create decentralized finance applications using Solana''s high-speed blockchain',
  'https://www.youtube.com/watch?v=example2',
  'GrWNH9qfwrvoCEoTm65hmnSh4z8a7Fp5MvJkdP5VbyoA'
),
(
  'Solana NFT Marketplace',
  'Build a complete NFT marketplace on Solana with Metaplex',
  'https://www.youtube.com/watch?v=example3',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
);

-- Insert sample lessons
INSERT INTO lessons (course_id, title, description, youtube_url, order_index, creator_wallet)
SELECT 
  c.id,
  'Introduction to ' || c.title,
  'Getting started with ' || c.title,
  'https://www.youtube.com/watch?v=lesson1',
  1,
  c.creator_wallet
FROM courses c
WHERE c.title = 'Solana Development Fundamentals';

-- Insert sample user profiles
INSERT INTO user_profiles (wallet_address, username, bio, is_verified) VALUES
(
  '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  'solana_dev',
  'Solana blockchain developer and educator',
  true
),
(
  'GrWNH9qfwrvoCEoTm65hmnSh4z8a7Fp5MvJkdP5VbyoA',
  'defi_builder',
  'DeFi protocol architect on Solana',
  true
),
(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'nft_creator',
  'NFT marketplace developer',
  false
);

-- Insert sample donations (using realistic Solana transaction signatures)
INSERT INTO donations (course_id, donor_wallet, recipient_wallet, amount_sol, amount_lamports, tx_signature, block_height)
SELECT 
  c.id,
  'DonorWallet1111111111111111111111111111111',
  c.creator_wallet,
  0.1,
  100000000,
  '5VfydnLu4XWeL3tAHMEHyLfWG18rWZ/PCVS1TrAyLtBpmpPZYayy2R1F8mAGhBKoEn4oO77S8MuisihzhKcDgw==',
  150000000
FROM courses c
WHERE c.title = 'Solana Development Fundamentals';
