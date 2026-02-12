-- Migration: Make menu_item_id nullable in custom_order_selections
-- Since we now store multiple items in custom_order_items table,
-- the custom_order_selections table is just a summary/header record

-- Make menu_item_id nullable
ALTER TABLE public.custom_order_selections
ALTER COLUMN menu_item_id DROP NOT NULL;

-- Make price nullable (since we now use total_amount instead)
ALTER TABLE public.custom_order_selections
ALTER COLUMN price DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.custom_order_selections.menu_item_id IS 'Legacy field - nullable since items are now stored in custom_order_items table';
COMMENT ON COLUMN public.custom_order_selections.price IS 'Legacy field - nullable, use total_amount instead';
