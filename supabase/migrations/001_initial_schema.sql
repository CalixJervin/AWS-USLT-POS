-- supabase/migrations/001_initial_schema.sql

-- TABLE: staff
CREATE TABLE staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('cashier', 'admin')),
  pin_hash text NOT NULL,
  avatar_color text,
  created_at timestamptz DEFAULT now()
);

-- TABLE: ingredients
CREATE TABLE ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  unit text NOT NULL,
  current_stock numeric NOT NULL DEFAULT 0,
  low_stock_threshold numeric NOT NULL DEFAULT 0,
  cost_per_unit numeric,
  supplier text,
  created_at timestamptz DEFAULT now()
);

-- TABLE: recipes
CREATE TABLE recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  yield integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- TABLE: products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  type text NOT NULL CHECK (type IN ('made-to-order', 'ready-made')) DEFAULT 'ready-made',
  image_url text,
  in_stock boolean NOT NULL DEFAULT true,
  availability text DEFAULT 'all-day',
  quantity numeric DEFAULT 0,
  low_stock_threshold numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- TABLE: product_variants
CREATE TABLE product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  size text NOT NULL,
  price numeric NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL
);

-- TABLE: recipe_ingredients
CREATE TABLE recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity numeric NOT NULL
);

-- TABLE: restock_logs
CREATE TABLE restock_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity_added numeric NOT NULL,
  supplier text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- TABLE: orders
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id),
  total numeric NOT NULL,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- TABLE: order_items
CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  variant_id uuid REFERENCES product_variants(id),
  product_name text NOT NULL,
  size text,
  price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);

-- TABLE: sales_logs
CREATE TABLE sales_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on ALL tables
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;

-- TODO: Replace open RLS policies with role-based policies when backend auth is implemented
CREATE POLICY "Allow all for now" ON staff FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON ingredients FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON recipes FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON products FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON product_variants FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON recipe_ingredients FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON restock_logs FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON orders FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON order_items FOR ALL USING (true);
CREATE POLICY "Allow all for now" ON sales_logs FOR ALL USING (true);

-- Enable Realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE ingredients;
ALTER PUBLICATION supabase_realtime ADD TABLE product_variants;

-- TRIGGER FUNCTION: update_product_in_stock
-- For ready-made: in_stock = (quantity > 0)
-- For made-to-order: we could check ingredients, but for simplicity we'll let the user toggle it or handle it in the sale deduction
CREATE OR REPLACE FUNCTION update_product_in_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'ready-made' THEN
    NEW.in_stock := NEW.quantity > 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_product_in_stock
BEFORE INSERT OR UPDATE OF quantity ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_in_stock();

-- POSTGRES FUNCTION: deduct_stock_on_sale
CREATE OR REPLACE FUNCTION deduct_stock_on_sale(p_order_items jsonb)
RETURNS TABLE (ingredient_id uuid, ingredient_name text, current_stock numeric, threshold numeric)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity numeric;
  v_recipe_id uuid;
  v_product_type text;
  v_product_name text;
  v_ri RECORD;
  v_available_qty numeric;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items) LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_variant_id := (v_item->>'variant_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;

    -- Get product info
    SELECT name, type, quantity INTO v_product_name, v_product_type, v_available_qty 
    FROM products WHERE id = v_product_id;

    IF v_product_type = 'ready-made' THEN
      -- Check if enough ready-made quantity exists
      IF v_available_qty < v_quantity THEN
        RAISE EXCEPTION 'Insufficient stock for %: only % left, but % requested', v_product_name, v_available_qty, v_quantity;
      END IF;

      -- Deduct product quantity
      UPDATE products 
      SET quantity = products.quantity - v_quantity
      WHERE id = v_product_id;
      
    ELSIF v_product_type = 'made-to-order' THEN
      -- Get recipe id from variant
      SELECT recipe_id INTO v_recipe_id FROM product_variants WHERE id = v_variant_id;
      
      IF v_recipe_id IS NOT NULL THEN
        -- Check ALL ingredients in recipe first before deducting any
        FOR v_ri IN SELECT ri.ingredient_id, i.name as ing_name, i.current_stock as ing_stock, ri.quantity as recipe_qty, r.yield 
                    FROM recipe_ingredients ri 
                    JOIN recipes r ON ri.recipe_id = r.id
                    JOIN ingredients i ON ri.ingredient_id = i.id
                    WHERE ri.recipe_id = v_recipe_id LOOP
          
          IF v_ri.ing_stock < (v_ri.recipe_qty / v_ri.yield) * v_quantity THEN
            RAISE EXCEPTION 'Insufficient ingredient stock for %: % only has % left', v_product_name, v_ri.ing_name, v_ri.ing_stock;
          END IF;
        END LOOP;

        -- If check passed, deduct each ingredient
        FOR v_ri IN SELECT ri.ingredient_id, ri.quantity as recipe_qty, r.yield 
                    FROM recipe_ingredients ri 
                    JOIN recipes r ON ri.recipe_id = r.id
                    WHERE ri.recipe_id = v_recipe_id LOOP
          UPDATE ingredients
          SET current_stock = ingredients.current_stock - (v_ri.recipe_qty / v_ri.yield) * v_quantity
          WHERE ingredients.id = v_ri.ingredient_id;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  -- Return ingredients OR ready-made products below threshold
  RETURN QUERY
  SELECT ingredients.id, ingredients.name, ingredients.current_stock, ingredients.low_stock_threshold
  FROM ingredients
  WHERE ingredients.current_stock <= ingredients.low_stock_threshold
  UNION ALL
  SELECT products.id, products.name, products.quantity, products.low_stock_threshold
  FROM products
  WHERE products.type = 'ready-made' AND products.quantity <= products.low_stock_threshold;
END;
$$;

-- RPC: create_complete_order
-- Handles order creation, item insertion, and stock deduction in ONE atomic transaction
CREATE OR REPLACE FUNCTION create_complete_order(
  p_staff_id uuid,
  p_total numeric,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_order_id uuid;
  v_item jsonb;
BEGIN
  -- 1. Create the main order
  INSERT INTO orders (staff_id, total, status)
  VALUES (p_staff_id, p_total, 'completed')
  RETURNING id INTO v_order_id;

  -- 2. Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (
      order_id, 
      product_id, 
      variant_id, 
      product_name, 
      size, 
      price, 
      quantity
    )
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'variant_id')::uuid,
      v_item->>'product_name',
      v_item->>'size',
      (v_item->>'price')::numeric,
      (v_item->>'quantity')::integer
    );
  END LOOP;

  -- 3. Deduct stock using the existing failsafe function
  -- If this fails (insufficient stock), the entire transaction rolls back
  PERFORM deduct_stock_on_sale(p_items);

  RETURN v_order_id;
END;
$$;

-- RPC: restock_ingredient_v2
-- Atomic restock and log entry
CREATE OR REPLACE FUNCTION restock_ingredient_v2(
  p_id uuid,
  p_quantity_added numeric,
  p_supplier text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Add to logs
  INSERT INTO restock_logs (ingredient_id, quantity_added, supplier, notes)
  VALUES (p_id, p_quantity_added, p_supplier, p_notes);

  -- 2. Update stock
  UPDATE ingredients
  SET current_stock = ingredients.current_stock + p_quantity_added
  WHERE id = p_id;
END;
$$;

-- RPC: restock_product_v2
-- Atomic product restock and log entry
CREATE OR REPLACE FUNCTION restock_product_v2(
  p_id uuid,
  p_quantity_added numeric,
  p_supplier text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  v_current_qty numeric;
  v_in_stock boolean;
BEGIN
  -- 1. Add to logs
  INSERT INTO restock_logs (product_id, quantity_added, supplier, notes)
  VALUES (p_id, p_quantity_added, p_supplier, p_notes);

  -- 2. Get current info
  SELECT quantity, in_stock INTO v_current_qty, v_in_stock FROM products WHERE id = p_id;

  -- 3. Update stock (Trigger handles in_stock logic)
  UPDATE products
  SET quantity = COALESCE(v_current_qty, 0) + p_quantity_added
  WHERE id = p_id;
END;
$$;

-- RPC: create_recipe_v2
CREATE OR REPLACE FUNCTION create_recipe_v2(
  p_name text,
  p_yield integer,
  p_ingredients jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_recipe_id uuid;
  v_ri jsonb;
BEGIN
  INSERT INTO recipes (name, yield)
  VALUES (p_name, p_yield)
  RETURNING id INTO v_recipe_id;

  FOR v_ri IN SELECT * FROM jsonb_array_elements(p_ingredients) LOOP
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity)
    VALUES (v_recipe_id, (v_ri->>'ingredientId')::uuid, (v_ri->>'quantity')::numeric);
  END LOOP;

  RETURN v_recipe_id;
END;
$$;

-- RPC: create_product_v2
CREATE OR REPLACE FUNCTION create_product_v2(
  p_name text,
  p_category text,
  p_type text,
  p_image_url text,
  p_in_stock boolean,
  p_availability text,
  p_quantity numeric DEFAULT 0,
  p_low_stock_threshold numeric DEFAULT 0,
  p_variants jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id uuid;
  v_v jsonb;
BEGIN
  INSERT INTO products (
    name, category, type, image_url, in_stock, 
    availability, quantity, low_stock_threshold
  )
  VALUES (
    p_name, p_category, p_type, p_image_url, COALESCE(p_in_stock, true),
    COALESCE(p_availability, 'all-day'), COALESCE(p_quantity, 0), COALESCE(p_low_stock_threshold, 0)
  )
  RETURNING id INTO v_product_id;

  IF p_variants IS NOT NULL AND jsonb_array_length(p_variants) > 0 THEN
    FOR v_v IN SELECT * FROM jsonb_array_elements(p_variants) LOOP
      INSERT INTO product_variants (product_id, size, price, recipe_id)
      VALUES (
        v_product_id, 
        COALESCE(v_v->>'size', 'Regular'), 
        (v_v->>'price')::numeric, 
        CASE 
          WHEN v_v->>'recipeId' IS NOT NULL AND v_v->>'recipeId' <> '' 
          THEN (v_v->>'recipeId')::uuid 
          ELSE NULL 
        END
      );
    END LOOP;
  END IF;

  RETURN v_product_id;
END;
$$;
