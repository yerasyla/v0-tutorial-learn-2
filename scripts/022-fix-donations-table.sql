-- Drop existing donations table if it exists
DROP TABLE IF EXISTS donations CASCADE;

-- Create donations table with proper structure
CREATE TABLE donations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  donor_wallet TEXT NOT NULL,
  amount TEXT NOT NULL, -- Store as text to preserve precision
  tx_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_donations_course_id ON donations(course_id);
CREATE INDEX idx_donations_donor_wallet ON donations(donor_wallet);
CREATE INDEX idx_donations_tx_hash ON donations(tx_hash);
CREATE INDEX idx_donations_created_at ON donations(created_at DESC);

-- Enable RLS
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read donations (for displaying stats)
CREATE POLICY "Anyone can read donations" ON donations
  FOR SELECT USING (true);

-- Only allow service role to insert donations (via API)
CREATE POLICY "Service role can insert donations" ON donations
  FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON donations TO anon, authenticated;
GRANT ALL ON donations TO service_role;
