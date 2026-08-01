-- supabase/migrations/005_categories.sql

-- TABLE: categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Allow all for now" ON categories FOR ALL USING (true);

-- Enable Realtime for categories
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- Insert default categories
INSERT INTO categories (name)
VALUES 
  ('Hot Coffee'),
  ('Iced Coffee'),
  ('Milk Tea'),
  ('Fruit Tea'),
  ('Pastries')
ON CONFLICT (name) DO NOTHING;
