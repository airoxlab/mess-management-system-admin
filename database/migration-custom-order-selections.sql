-- Migration: Add Custom Order Selections Table
-- Description: Stores user selections when custom ordering is enabled
-- Date: 2026-02-12
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. Create custom_order_selections table
-- ============================================

CREATE TABLE IF NOT EXISTS public.custom_order_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  member_id uuid NOT NULL,
  member_type character varying(20) NOT NULL CHECK (
    (member_type)::text = ANY (
      ARRAY[
        'student'::character varying,
        'faculty'::character varying,
        'staff'::character varying
      ]::text[]
    )
  ),

  -- Reference to menu_items (custom ordering items)
  menu_item_id uuid NOT NULL,

  -- Meal details
  meal_type character varying(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  date date NOT NULL,

  -- Price at time of selection (snapshot for reporting)
  price decimal(10,2) NULL,
  item_name text NULL,

  -- Timestamps
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT custom_order_selections_pkey PRIMARY KEY (id),
  CONSTRAINT custom_order_selections_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT custom_order_selections_menu_item_id_fkey FOREIGN KEY (menu_item_id)
    REFERENCES menu_items(id) ON DELETE CASCADE,

  -- One selection per member per meal per date
  CONSTRAINT custom_order_selections_unique UNIQUE (member_id, member_type, meal_type, date)
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_order_selections_member
ON public.custom_order_selections USING btree (member_id, member_type, date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_custom_order_selections_item
ON public.custom_order_selections USING btree (menu_item_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_custom_order_selections_org_date
ON public.custom_order_selections USING btree (organization_id, date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_custom_order_selections_meal_type
ON public.custom_order_selections USING btree (meal_type) TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE TRIGGER update_custom_order_selections_updated_at
BEFORE UPDATE ON custom_order_selections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Migration Complete
-- ============================================

-- To verify the migration:
-- SELECT * FROM custom_order_selections;

-- Example usage (for testing):
-- INSERT INTO custom_order_selections (
--   organization_id,
--   member_id,
--   member_type,
--   menu_item_id,
--   meal_type,
--   date,
--   price,
--   item_name
-- ) VALUES (
--   'your-org-id',
--   'your-member-id',
--   'student',
--   'menu-item-id',
--   'dinner',
--   '2026-02-12',
--   500.00,
--   'chicken nahaeri'
-- );
