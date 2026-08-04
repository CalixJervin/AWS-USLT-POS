-- supabase/migrations/006_rls_policies.sql

-- 1. SET RPC FUNCTIONS TO SECURITY DEFINER
-- This allows atomic order creation & stock deduction RPCs to run with owner privileges
-- avoiding RLS permission blocks during internal stock/ingredient updates.
ALTER FUNCTION create_complete_order(uuid, numeric, jsonb) SECURITY DEFINER;
ALTER FUNCTION deduct_stock_on_sale(jsonb) SECURITY DEFINER;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 3. DROP PREVIOUS RESTRICTIVE POLICIES
DROP POLICY IF EXISTS "Allow all for now" ON products;
DROP POLICY IF EXISTS "Allow all for now" ON orders;
DROP POLICY IF EXISTS "Allow all for now" ON order_items;

DROP POLICY IF EXISTS "Public kiosk read products" ON products;
DROP POLICY IF EXISTS "Authenticated full access products" ON products;
DROP POLICY IF EXISTS "Public kiosk insert orders" ON orders;
DROP POLICY IF EXISTS "Authenticated full access orders" ON orders;
DROP POLICY IF EXISTS "Public kiosk insert order_items" ON order_items;
DROP POLICY IF EXISTS "Authenticated full access order_items" ON order_items;

DROP POLICY IF EXISTS "Enable all access for orders" ON orders;
DROP POLICY IF EXISTS "Enable all access for order_items" ON order_items;
DROP POLICY IF EXISTS "Enable all access for products" ON products;

-- 4. CREATE POLICIES TO ALLOW APP OPERATIONS
-- Since Staff & Cashiers authenticate via custom PIN (staff table) using the Supabase client,
-- app operations run under public/anon role.

CREATE POLICY "Enable all access for products"
  ON products FOR ALL TO public
  USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for orders"
  ON orders FOR ALL TO public
  USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for order_items"
  ON order_items FOR ALL TO public
  USING (true) WITH CHECK (true);
