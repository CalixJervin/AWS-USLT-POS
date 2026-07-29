-- Add permission columns and shift tracking to staff table
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS can_manage_menu BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS can_manage_inventory BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shift_start TIMESTAMPTZ;
