ALTER TABLE posts ADD COLUMN IF NOT EXISTS featured_on_landing boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_posts_featured_on_landing
  ON posts(featured_on_landing)
  WHERE featured_on_landing = true;
