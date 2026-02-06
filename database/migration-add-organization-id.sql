-- ============================================
-- MIGRATION: Add organization_id to all tables for multi-tenancy
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Get your existing organization ID
-- (This will be used to fill existing rows)
DO $$
DECLARE
  default_org_id uuid;
BEGIN
  SELECT id INTO default_org_id FROM public.organizations LIMIT 1;

  IF default_org_id IS NULL THEN
    RAISE EXCEPTION 'No organization found. Please create one first.';
  END IF;

  RAISE NOTICE 'Using organization ID: %', default_org_id;

  -- ============================================
  -- Step 2: Add organization_id column to each table
  -- (Added as nullable first, then filled, then set NOT NULL)
  -- ============================================

  -- 1. staff_members
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_members' AND column_name = 'organization_id') THEN
    ALTER TABLE public.staff_members ADD COLUMN organization_id uuid;
    UPDATE public.staff_members SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.staff_members ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.staff_members ADD CONSTRAINT staff_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_staff_organization ON public.staff_members USING btree (organization_id);
    RAISE NOTICE 'staff_members: organization_id added';
  ELSE
    RAISE NOTICE 'staff_members: organization_id already exists, skipping';
  END IF;

  -- 2. faculty_members
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'faculty_members' AND column_name = 'organization_id') THEN
    ALTER TABLE public.faculty_members ADD COLUMN organization_id uuid;
    UPDATE public.faculty_members SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.faculty_members ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.faculty_members ADD CONSTRAINT faculty_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_faculty_organization ON public.faculty_members USING btree (organization_id);
    RAISE NOTICE 'faculty_members: organization_id added';
  ELSE
    RAISE NOTICE 'faculty_members: organization_id already exists, skipping';
  END IF;

  -- 3. member_meal_packages
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'member_meal_packages' AND column_name = 'organization_id') THEN
    ALTER TABLE public.member_meal_packages ADD COLUMN organization_id uuid;
    UPDATE public.member_meal_packages SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.member_meal_packages ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.member_meal_packages ADD CONSTRAINT member_meal_packages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_member_meal_packages_organization ON public.member_meal_packages USING btree (organization_id);
    RAISE NOTICE 'member_meal_packages: organization_id added';
  ELSE
    RAISE NOTICE 'member_meal_packages: organization_id already exists, skipping';
  END IF;

  -- 4. meal_selections
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_selections' AND column_name = 'organization_id') THEN
    ALTER TABLE public.meal_selections ADD COLUMN organization_id uuid;
    UPDATE public.meal_selections SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.meal_selections ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.meal_selections ADD CONSTRAINT meal_selections_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_meal_selections_organization ON public.meal_selections USING btree (organization_id);
    RAISE NOTICE 'meal_selections: organization_id added';
  ELSE
    RAISE NOTICE 'meal_selections: organization_id already exists, skipping';
  END IF;

  -- 5. meal_reports
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_reports' AND column_name = 'organization_id') THEN
    ALTER TABLE public.meal_reports ADD COLUMN organization_id uuid;
    UPDATE public.meal_reports SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.meal_reports ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.meal_reports ADD CONSTRAINT meal_reports_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_meal_reports_organization ON public.meal_reports USING btree (organization_id);
    RAISE NOTICE 'meal_reports: organization_id added';
  ELSE
    RAISE NOTICE 'meal_reports: organization_id already exists, skipping';
  END IF;

  -- 6. member_packages
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'member_packages' AND column_name = 'organization_id') THEN
    ALTER TABLE public.member_packages ADD COLUMN organization_id uuid;
    UPDATE public.member_packages SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.member_packages ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.member_packages ADD CONSTRAINT member_packages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_member_packages_organization ON public.member_packages USING btree (organization_id);
    RAISE NOTICE 'member_packages: organization_id added';
  ELSE
    RAISE NOTICE 'member_packages: organization_id already exists, skipping';
  END IF;

  -- 7. package_disabled_days
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'package_disabled_days' AND column_name = 'organization_id') THEN
    ALTER TABLE public.package_disabled_days ADD COLUMN organization_id uuid;
    UPDATE public.package_disabled_days SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.package_disabled_days ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.package_disabled_days ADD CONSTRAINT package_disabled_days_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_package_disabled_days_organization ON public.package_disabled_days USING btree (organization_id);
    RAISE NOTICE 'package_disabled_days: organization_id added';
  ELSE
    RAISE NOTICE 'package_disabled_days: organization_id already exists, skipping';
  END IF;

  -- 8. meal_consumption_history
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meal_consumption_history' AND column_name = 'organization_id') THEN
    ALTER TABLE public.meal_consumption_history ADD COLUMN organization_id uuid;
    UPDATE public.meal_consumption_history SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.meal_consumption_history ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.meal_consumption_history ADD CONSTRAINT meal_consumption_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_meal_consumption_organization ON public.meal_consumption_history USING btree (organization_id);
    RAISE NOTICE 'meal_consumption_history: organization_id added';
  ELSE
    RAISE NOTICE 'meal_consumption_history: organization_id already exists, skipping';
  END IF;

  -- 9. package_history
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'package_history' AND column_name = 'organization_id') THEN
    ALTER TABLE public.package_history ADD COLUMN organization_id uuid;
    UPDATE public.package_history SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.package_history ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.package_history ADD CONSTRAINT package_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_package_history_organization ON public.package_history USING btree (organization_id);
    RAISE NOTICE 'package_history: organization_id added';
  ELSE
    RAISE NOTICE 'package_history: organization_id already exists, skipping';
  END IF;

  -- 10. daily_basis_transactions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_basis_transactions' AND column_name = 'organization_id') THEN
    ALTER TABLE public.daily_basis_transactions ADD COLUMN organization_id uuid;
    UPDATE public.daily_basis_transactions SET organization_id = default_org_id WHERE organization_id IS NULL;
    ALTER TABLE public.daily_basis_transactions ALTER COLUMN organization_id SET NOT NULL;
    ALTER TABLE public.daily_basis_transactions ADD CONSTRAINT daily_basis_transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_daily_transactions_organization ON public.daily_basis_transactions USING btree (organization_id);
    RAISE NOTICE 'daily_basis_transactions: organization_id added';
  ELSE
    RAISE NOTICE 'daily_basis_transactions: organization_id already exists, skipping';
  END IF;

END $$;

-- ============================================
-- DONE! Verify the migration
-- ============================================
SELECT
  table_name,
  column_name,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE column_name = 'organization_id'
  AND table_schema = 'public'
ORDER BY table_name;
