-- Migration: Create custom_order_items table for storing multiple items with quantities
-- This table stores individual items in a custom order (shopping cart items)

-- Drop existing table if needed (only for development)
-- DROP TABLE IF EXISTS public.custom_order_items CASCADE;

-- Create custom_order_items table
CREATE TABLE IF NOT EXISTS public.custom_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  member_id uuid NOT NULL,
  member_type character varying(20) NOT NULL CHECK (
    (member_type)::text = ANY (ARRAY['student', 'faculty', 'staff']::text[])
  ),
  date date NOT NULL,
  meal_type character varying(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner')),
  menu_item_id uuid NOT NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL,
  total_price decimal(10,2) NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT custom_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT custom_order_items_organization_fkey FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id) ON DELETE CASCADE,
  CONSTRAINT custom_order_items_menu_item_fkey FOREIGN KEY (menu_item_id)
    REFERENCES public.menu_items(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_custom_order_items_member
  ON public.custom_order_items(member_id, member_type, date, meal_type);

CREATE INDEX IF NOT EXISTS idx_custom_order_items_org
  ON public.custom_order_items(organization_id);

-- Enable Row Level Security
ALTER TABLE public.custom_order_items ENABLE ROW LEVEL SECURITY;

-- Create policy for organization isolation
CREATE POLICY "Users can access their organization's custom order items"
  ON public.custom_order_items
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations
    )
  );

-- Grant permissions
GRANT ALL ON public.custom_order_items TO authenticated;
GRANT ALL ON public.custom_order_items TO service_role;

-- Add comment
COMMENT ON TABLE public.custom_order_items IS 'Stores individual items in custom orders with quantities (shopping cart items)';
