-- Migration: Add Package Deactivation Feature
-- Description: Adds 'deactivated' status to member_packages and 'deactivated'/'reactivated' actions to package_history
-- Date: 2026-02-07
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- 1. Update member_packages status constraint
-- ============================================

-- Drop the existing status CHECK constraint
ALTER TABLE public.member_packages
DROP CONSTRAINT IF EXISTS member_packages_status_check;

-- Add new status CHECK constraint including 'deactivated'
ALTER TABLE public.member_packages
ADD CONSTRAINT member_packages_status_check
CHECK (
  (status)::text = ANY (
    ARRAY[
      'active'::character varying,
      'expired'::character varying,
      'renewed'::character varying,
      'deactivated'::character varying
    ]::text[]
  )
);

-- ============================================
-- 2. Update package_history action constraint
-- ============================================

-- Drop the existing action CHECK constraint
ALTER TABLE public.package_history
DROP CONSTRAINT IF EXISTS package_history_action_check;

-- Add new action CHECK constraint including 'deactivated' and 'reactivated'
ALTER TABLE public.package_history
ADD CONSTRAINT package_history_action_check
CHECK (
  (action)::text = ANY (
    ARRAY[
      'created'::character varying,
      'renewed'::character varying,
      'expired'::character varying,
      'cancelled'::character varying,
      'deactivated'::character varying,
      'reactivated'::character varying
    ]::text[]
  )
);

-- ============================================
-- 3. Add notes column to package_history (if not exists)
-- ============================================

-- Add notes column to store deactivation reasons and other notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'package_history'
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE public.package_history
    ADD COLUMN notes text NULL;
  END IF;
END $$;

-- ============================================
-- 4. Create index on status for better query performance
-- ============================================

-- Create index on member_packages.status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_member_packages_status
ON public.member_packages USING btree (status);

-- Create index on package_history.action if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_package_history_action
ON public.package_history USING btree (action);

-- ============================================
-- Migration Complete
-- ============================================

-- To verify the migration:
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_schema = 'public'
-- AND constraint_name IN ('member_packages_status_check', 'package_history_action_check');
