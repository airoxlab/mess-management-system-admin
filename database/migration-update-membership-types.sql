-- Migration: Update membership_type constraints to support all package types
-- Date: 2026-02-11
-- Description: Updates CHECK constraints on student_members, faculty_members, and staff_members tables
--              to allow all 4 membership types: full_time, partial_full_time, partial, daily_basis

-- STEP 1: Drop existing CHECK constraints FIRST
ALTER TABLE public.student_members DROP CONSTRAINT IF EXISTS student_members_membership_type_check;
ALTER TABLE public.faculty_members DROP CONSTRAINT IF EXISTS faculty_members_membership_type_check;
ALTER TABLE public.staff_members DROP CONSTRAINT IF EXISTS staff_members_membership_type_check;

-- STEP 2: Now update existing data to use new valid values
-- Convert 'day_to_day' to 'daily_basis' for all member types
UPDATE public.student_members
SET membership_type = 'daily_basis'
WHERE membership_type = 'day_to_day';

UPDATE public.faculty_members
SET membership_type = 'daily_basis'
WHERE membership_type = 'day_to_day';

UPDATE public.staff_members
SET membership_type = 'daily_basis'
WHERE membership_type = 'day_to_day';

-- Update any other invalid values to 'full_time' as default
UPDATE public.student_members
SET membership_type = 'full_time'
WHERE membership_type NOT IN ('full_time', 'partial_full_time', 'partial', 'daily_basis');

UPDATE public.faculty_members
SET membership_type = 'full_time'
WHERE membership_type NOT IN ('full_time', 'partial_full_time', 'partial', 'daily_basis');

UPDATE public.staff_members
SET membership_type = 'full_time'
WHERE membership_type NOT IN ('full_time', 'partial_full_time', 'partial', 'daily_basis');

-- STEP 3: Add updated CHECK constraints with all 4 membership types
ALTER TABLE public.student_members
ADD CONSTRAINT student_members_membership_type_check CHECK (
  membership_type IN ('full_time', 'partial_full_time', 'partial', 'daily_basis')
);

ALTER TABLE public.faculty_members
ADD CONSTRAINT faculty_members_membership_type_check CHECK (
  membership_type IN ('full_time', 'partial_full_time', 'partial', 'daily_basis')
);

ALTER TABLE public.staff_members
ADD CONSTRAINT staff_members_membership_type_check CHECK (
  membership_type IN ('full_time', 'partial_full_time', 'partial', 'daily_basis')
);

-- Add comments
COMMENT ON CONSTRAINT student_members_membership_type_check ON public.student_members IS 'Allows all 4 package types: full_time, partial_full_time, partial, daily_basis';
COMMENT ON CONSTRAINT faculty_members_membership_type_check ON public.faculty_members IS 'Allows all 4 package types: full_time, partial_full_time, partial, daily_basis';
COMMENT ON CONSTRAINT staff_members_membership_type_check ON public.staff_members IS 'Allows all 4 package types: full_time, partial_full_time, partial, daily_basis';
