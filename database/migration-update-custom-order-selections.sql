-- Migration: Update custom_order_selections table for multiple items support
-- Add fields to track total amount and item count

-- Add new columns if they don't exist
ALTER TABLE public.custom_order_selections
ADD COLUMN IF NOT EXISTS total_amount decimal(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS item_count integer DEFAULT 0;

-- Update existing records to set default values
UPDATE public.custom_order_selections
SET total_amount = COALESCE(price, 0),
    item_count = 1
WHERE total_amount IS NULL OR item_count IS NULL;

-- Add comment
COMMENT ON COLUMN public.custom_order_selections.total_amount IS 'Total amount for all items in this custom order';
COMMENT ON COLUMN public.custom_order_selections.item_count IS 'Number of items in this custom order';
