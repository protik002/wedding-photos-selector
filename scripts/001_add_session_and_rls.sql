-- Add session_token column to voters (for server-side session management)
ALTER TABLE voters ADD COLUMN IF NOT EXISTS session_token text UNIQUE;

-- Add unique constraint on votes to prevent duplicate votes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'votes_voter_photo_unique'
  ) THEN
    ALTER TABLE votes ADD CONSTRAINT votes_voter_photo_unique UNIQUE (voter_id, photo_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Service role full access on voters" ON voters;
DROP POLICY IF EXISTS "Service role full access on votes" ON votes;
DROP POLICY IF EXISTS "Anyone can read votes" ON votes;
DROP POLICY IF EXISTS "Anyone can read voters" ON voters;

-- RLS Policies for voters - service role bypasses RLS, but anon can only read
CREATE POLICY "Anyone can read voters" ON voters FOR SELECT USING (true);

-- RLS Policies for votes - anon can only read, service role does all writes
CREATE POLICY "Anyone can read votes" ON votes FOR SELECT USING (true);
