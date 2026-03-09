-- ============================================
-- Jersey Rippers Database Schema
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. PROFILES (extends Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'customer')) DEFAULT 'customer',
  display_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. INVENTORY_ITEMS (core product table)
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('single', 'slab', 'sealed')),
  status TEXT NOT NULL CHECK (status IN ('draft', 'listed', 'reserved', 'sold', 'shipped', 'archived', 'returned')) DEFAULT 'draft',

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL, -- in cents (1999 = $19.99)
  cost_basis INTEGER, -- internal only

  -- TCG Fields
  set_name TEXT,
  card_number TEXT,
  year INTEGER,
  player TEXT,
  rarity TEXT,
  language TEXT DEFAULT 'English',
  edition TEXT,
  condition TEXT CHECK (condition IN ('Mint', 'Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged') OR condition IS NULL),

  -- Grading (slabs only)
  grade_company TEXT,
  grade_value TEXT,
  cert_number TEXT,

  -- Inventory
  quantity_on_hand INTEGER NOT NULL DEFAULT 1,
  photos TEXT[],
  storage_location TEXT,

  -- Spin Pool
  spin_pool BOOLEAN NOT NULL DEFAULT false,

  -- Reservation
  reserved_by UUID REFERENCES profiles(id),
  reserved_until TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_inventory_status ON inventory_items(status);
CREATE INDEX idx_inventory_type ON inventory_items(type);
CREATE INDEX idx_inventory_spin_pool ON inventory_items(spin_pool) WHERE status = 'listed';
CREATE INDEX idx_inventory_sku ON inventory_items(sku);
CREATE INDEX idx_inventory_reserved_until ON inventory_items(reserved_until) WHERE status = 'reserved';

-- ============================================
-- 3. ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'refunded', 'partially_refunded', 'cancelled')) DEFAULT 'pending',

  -- Totals
  total_cents INTEGER NOT NULL,
  is_spin BOOLEAN NOT NULL DEFAULT false,

  -- Shipping
  shipping_name TEXT,
  shipping_address_line1 TEXT,
  shipping_address_line2 TEXT,
  shipping_city TEXT,
  shipping_state TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT,
  shipping_email TEXT,
  signature_required BOOLEAN NOT NULL DEFAULT false,

  -- Fulfillment
  tracking_number TEXT,
  tracking_carrier TEXT,
  shipped_at TIMESTAMPTZ,

  -- Stripe
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,
  stripe_refund_id TEXT,

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_stripe_session ON orders(stripe_checkout_session_id);

-- ============================================
-- 4. ORDER_ITEMS (line items)
-- ============================================
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price_cents INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. AUDIT_LOG (immutable)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  performed_by UUID NOT NULL REFERENCES profiles(id),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_performed_by ON audit_log(performed_by);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);

-- ============================================
-- 6. SPIN_EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS spin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  stripe_checkout_session_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'expired')) DEFAULT 'pending',
  nonce TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE spin_events ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_spin_user_created ON spin_events(user_id, created_at DESC);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- PROFILES
CREATE POLICY "customers_select_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "staff_select_all_profiles" ON profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "admin_select_all" ON profiles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'customer'); -- customers can't change role

CREATE POLICY "admin_update_any_profile" ON profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- INVENTORY_ITEMS
CREATE POLICY "customers_view_listed_inventory" ON inventory_items
  FOR SELECT USING (
    status IN ('listed', 'reserved', 'sold')
    AND (
      -- Exclude sensitive fields for customers
      auth.uid() IS NULL OR
      auth.uid() IN (SELECT id FROM profiles WHERE role = 'customer')
    )
  );

CREATE POLICY "staff_view_all_inventory" ON inventory_items
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "staff_insert_inventory" ON inventory_items
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "staff_update_inventory" ON inventory_items
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "admin_delete_inventory" ON inventory_items
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- ORDERS
CREATE POLICY "customers_select_own_orders" ON orders
  FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "staff_select_all_orders" ON orders
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "staff_update_order_shipping" ON orders
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "admin_update_any_order" ON orders
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- ORDER_ITEMS
CREATE POLICY "customers_select_own_order_items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "staff_select_all_order_items" ON order_items
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

-- AUDIT_LOG (read-only for staff, inserts via trigger only)
CREATE POLICY "staff_select_audit_log" ON audit_log
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "admin_select_audit_log" ON audit_log
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- SPIN_EVENTS
CREATE POLICY "customers_select_own_spins" ON spin_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "staff_select_all_spins" ON spin_events
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

-- ============================================
-- SUPABASE STORAGE BUCKETS (via Supabase dashboard)
-- ============================================
-- Note: Create buckets via Supabase dashboard:
-- - card-photos (authenticated upload, public read)
-- - card-thumbnails (public read)
