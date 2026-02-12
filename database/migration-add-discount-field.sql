-- Migration: Add discount field to member_packages table
-- Date: 2026-02-11
-- Description: Adds a discount column to store discount amount for packages

-- Add discount column to member_packages table
ALTER TABLE public.member_packages
ADD COLUMN IF NOT EXISTS discount numeric(10, 2) NULL DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN public.member_packages.discount IS 'Discount amount applied to the package price (in PKR)';
