-- Add created_by field to inventory_items to track who uploaded each card
ALTER TABLE inventory_items ADD COLUMN created_by UUID REFERENCES profiles(id);

-- Backfill existing records with updated_by if it's set
UPDATE inventory_items SET created_by = updated_by WHERE created_by IS NULL AND updated_by IS NOT NULL;

-- Create index for dashboard queries
CREATE INDEX idx_inventory_created_by ON inventory_items(created_by);
