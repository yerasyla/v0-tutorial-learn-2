-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  donor_wallet TEXT NOT NULL,
  creator_wallet TEXT NOT NULL,
  amount TEXT NOT NULL, -- Store as text to preserve precision
  tx_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_donations_course_id ON donations(course_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_wallet ON donations(donor_wallet);
CREATE INDEX IF NOT EXISTS idx_donations_creator_wallet ON donations(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_donations_tx_hash ON donations(tx_hash);
CREATE INDEX IF NOT EXISTS idx_donations_created_at ON donations(created_at DESC);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can read donations" ON donations
  FOR SELECT USING (true);

-- Only service role can insert/update/delete donations
CREATE POLICY "Service role can manage donations" ON donations
  FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON donations TO anon;
GRANT SELECT ON donations TO authenticated;
GRANT ALL ON donations TO service_role;
