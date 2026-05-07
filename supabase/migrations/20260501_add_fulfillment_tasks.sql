-- ============================================
-- Fulfillment Tasks
-- Creates one operational task per paid order item.
-- ============================================

CREATE TABLE IF NOT EXISTS fulfillment_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
  assigned_to UUID REFERENCES profiles(id),
  status TEXT NOT NULL CHECK (
    status IN (
      'needs_packing',
      'packed',
      'label_created',
      'shipped',
      'delivered',
      'blocked',
      'cancelled'
    )
  ) DEFAULT 'needs_packing',
  storage_location TEXT,
  carrier TEXT,
  tracking_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  UNIQUE(order_item_id)
);

ALTER TABLE fulfillment_tasks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_order
  ON fulfillment_tasks(order_id);

CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_order_item
  ON fulfillment_tasks(order_item_id);

CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_inventory
  ON fulfillment_tasks(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_status
  ON fulfillment_tasks(status);

CREATE INDEX IF NOT EXISTS idx_fulfillment_tasks_assigned_to
  ON fulfillment_tasks(assigned_to);

DROP TRIGGER IF EXISTS update_fulfillment_tasks_updated_at ON fulfillment_tasks;
CREATE TRIGGER update_fulfillment_tasks_updated_at BEFORE UPDATE ON fulfillment_tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE POLICY "customers_select_own_fulfillment_tasks" ON fulfillment_tasks
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "staff_select_all_fulfillment_tasks" ON fulfillment_tasks
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "staff_insert_fulfillment_tasks" ON fulfillment_tasks
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role IN ('staff', 'admin')
    )
  );

CREATE POLICY "staff_update_fulfillment_tasks" ON fulfillment_tasks
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
