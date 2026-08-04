-- supabase/migrations/006_rls_policies.sql

-- Enable Row Level Security (RLS) on target tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop legacy/open policies if present
DROP POLICY IF EXISTS "Allow all for now" ON products;
DROP POLICY IF EXISTS "Allow all for now" ON orders;
DROP POLICY IF EXISTS "Allow all for now" ON order_items;

DROP POLICY IF EXISTS "Public kiosk read products" ON products;
DROP POLICY IF EXISTS "Authenticated full access products" ON products;

DROP POLICY IF EXISTS "Public kiosk insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated full access orders" ON orders;

DROP POLICY IF EXISTS "Public kiosk insert order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated full access order_items" ON order_items;

-- ============================================================================
-- PRODUCTS TABLE POLICIES
-- ============================================================================

-- Public (Kiosk): Can SELECT products
CREATE POLICY "Public kiosk read products"
  ON products
  FOR SELECT
  TO anon
  USING (true);

-- Authenticated (Staff/Admin): Can SELECT, INSERT, UPDATE, and DELETE on products
CREATE POLICY "Authenticated full access products"
  ON products
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ORDERS TABLE POLICIES
-- ============================================================================

-- Public (Kiosk): Can INSERT into orders
CREATE POLICY "Public kiosk insert orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated (Staff/Admin): Can SELECT, INSERT, UPDATE, and DELETE on orders
CREATE POLICY "Authenticated full access orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- ORDER_ITEMS TABLE POLICIES
-- ============================================================================

-- Public (Kiosk): Can INSERT into order_items
CREATE POLICY "Public kiosk insert order_items"
  ON order_items
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated (Staff/Admin): Can SELECT, INSERT, UPDATE, and DELETE on order_items
CREATE POLICY "Authenticated full access order_items"
  ON order_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
