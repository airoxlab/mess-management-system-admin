-- Migration: Add Menu Management Tables
-- Tables: menu_categories, menu_items
-- Run this SQL in your Supabase SQL Editor

-- 1. Menu Categories
create table if not exists public.menu_categories (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  name character varying(255) not null,
  description text null,
  sort_order integer null default 0,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint menu_categories_pkey primary key (id),
  constraint menu_categories_organization_id_fkey foreign key (organization_id) references organizations(id) on delete cascade
) TABLESPACE pg_default;

create index if not exists idx_menu_categories_organization on public.menu_categories using btree (organization_id) TABLESPACE pg_default;
create index if not exists idx_menu_categories_active on public.menu_categories using btree (is_active) TABLESPACE pg_default;

create trigger update_menu_categories_updated_at BEFORE
update on menu_categories for EACH row
execute FUNCTION update_updated_at_column();


-- 2. Menu Items
create table if not exists public.menu_items (
  id uuid not null default gen_random_uuid(),
  organization_id uuid not null,
  category_id uuid not null,
  name character varying(255) not null,
  description text null,
  price numeric(10, 2) not null default 0,
  image_url text null,
  is_available boolean null default true,
  sort_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint menu_items_pkey primary key (id),
  constraint menu_items_organization_id_fkey foreign key (organization_id) references organizations(id) on delete cascade,
  constraint menu_items_category_id_fkey foreign key (category_id) references menu_categories(id) on delete cascade
) TABLESPACE pg_default;

create index if not exists idx_menu_items_organization on public.menu_items using btree (organization_id) TABLESPACE pg_default;
create index if not exists idx_menu_items_category on public.menu_items using btree (category_id) TABLESPACE pg_default;
create index if not exists idx_menu_items_available on public.menu_items using btree (is_available) TABLESPACE pg_default;

create trigger update_menu_items_updated_at BEFORE
update on menu_items for EACH row
execute FUNCTION update_updated_at_column();
