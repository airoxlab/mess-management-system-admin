-- Migration: Add Menu Options Feature
-- Description: Allows admin to set daily/weekly menu options for all member types
-- Date: 2026-02-07
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. Create menu_options table
-- ============================================
-- Stores the meal options admin creates for each date and meal type

CREATE TABLE IF NOT EXISTS public.menu_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,

  -- Meal timing
  meal_type character varying(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  date date NOT NULL,

  -- Option details
  option_name text NOT NULL,
  option_description text NULL,

  -- Display and availability
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,

  -- Timestamps
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT menu_options_pkey PRIMARY KEY (id),
  CONSTRAINT menu_options_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_options_org_date
ON public.menu_options USING btree (organization_id, date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_menu_options_meal_type
ON public.menu_options USING btree (meal_type) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_menu_options_date
ON public.menu_options USING btree (date) TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE TRIGGER update_menu_options_updated_at
BEFORE UPDATE ON menu_options
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Create member_menu_selections table
-- ============================================
-- Tracks which option each member selected for each meal

CREATE TABLE IF NOT EXISTS public.member_menu_selections (
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
  menu_option_id uuid NOT NULL,

  -- For quick filtering
  meal_type character varying(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  date date NOT NULL,

  -- Timestamps
  created_at timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT member_menu_selections_pkey PRIMARY KEY (id),
  CONSTRAINT member_menu_selections_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT member_menu_selections_menu_option_id_fkey FOREIGN KEY (menu_option_id)
    REFERENCES menu_options(id) ON DELETE CASCADE,

  -- One selection per member per meal per date
  CONSTRAINT member_menu_selections_unique UNIQUE (member_id, member_type, meal_type, date)
) TABLESPACE pg_default;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_member_menu_selections_member
ON public.member_menu_selections USING btree (member_id, member_type, date) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_member_menu_selections_option
ON public.member_menu_selections USING btree (menu_option_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_member_menu_selections_org_date
ON public.member_menu_selections USING btree (organization_id, date) TABLESPACE pg_default;

-- ============================================
-- Migration Complete
-- ============================================

-- To verify the migration:
-- SELECT * FROM menu_options;
-- SELECT * FROM member_menu_selections;

-- Example usage (for testing):
-- INSERT INTO menu_options (organization_id, meal_type, date, option_name, option_description, sort_order)
-- VALUES
--   ('your-org-id', 'dinner', '2026-02-07', 'Non-veg Macaroni', 'Delicious pasta with meat sauce', 1),
--   ('your-org-id', 'dinner', '2026-02-07', 'Chicken Karahi', 'Spicy chicken curry', 2);
