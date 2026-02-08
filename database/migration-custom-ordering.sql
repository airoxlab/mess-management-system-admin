-- Migration: Add Custom Ordering Feature (À La Carte)
-- Description: Adds meal_settings table and updates menu_items to support meal-specific ordering
-- Date: 2026-02-07
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. Create meal_settings table
-- ============================================

CREATE TABLE IF NOT EXISTS public.meal_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,

  -- Toggle switches for enabling custom ordering per meal
  breakfast_enabled boolean NOT NULL DEFAULT false,
  lunch_enabled boolean NOT NULL DEFAULT false,
  dinner_enabled boolean NOT NULL DEFAULT false,

  -- Timestamps
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),

  CONSTRAINT meal_settings_pkey PRIMARY KEY (id),
  CONSTRAINT meal_settings_organization_id_fkey FOREIGN KEY (organization_id)
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT meal_settings_organization_unique UNIQUE (organization_id)
) TABLESPACE pg_default;

-- Create index on organization_id
CREATE INDEX IF NOT EXISTS idx_meal_settings_organization
ON public.meal_settings USING btree (organization_id) TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE TRIGGER update_meal_settings_updated_at
BEFORE UPDATE ON meal_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Add meal_type column to menu_items
-- ============================================

-- Add meal_type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'menu_items'
    AND column_name = 'meal_type'
  ) THEN
    ALTER TABLE public.menu_items
    ADD COLUMN meal_type character varying(50) NULL DEFAULT 'all';
  END IF;
END $$;

-- Add CHECK constraint for meal_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'menu_items'
    AND constraint_name = 'menu_items_meal_type_check'
  ) THEN
    ALTER TABLE public.menu_items
    ADD CONSTRAINT menu_items_meal_type_check
    CHECK (
      (meal_type)::text = ANY (
        ARRAY[
          'breakfast'::character varying,
          'lunch'::character varying,
          'dinner'::character varying,
          'all'::character varying
        ]::text[]
      )
    );
  END IF;
END $$;

-- Create index on meal_type for better query performance
CREATE INDEX IF NOT EXISTS idx_menu_items_meal_type
ON public.menu_items USING btree (meal_type);

-- ============================================
-- 3. Insert default meal_settings for existing organizations
-- ============================================

-- Insert default settings for all existing organizations
INSERT INTO public.meal_settings (organization_id, breakfast_enabled, lunch_enabled, dinner_enabled)
SELECT id, false, false, false
FROM public.organizations
WHERE id NOT IN (SELECT organization_id FROM public.meal_settings)
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================
-- Migration Complete
-- ============================================

-- To verify the migration:
-- SELECT * FROM meal_settings;
-- SELECT name, meal_type FROM menu_items;
