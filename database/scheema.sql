create table public.users (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid null,
  email character varying(255) not null,
  password character varying(255) not null,
  full_name character varying(255) null,
  role character varying(50) null default 'admin'::character varying,
  is_active boolean null default true,
  last_login timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint users_role_check check (
    (
      (role)::text = any (
        (
          array[
            'super_admin'::character varying,
            'admin'::character varying,
            'staff'::character varying,
            'viewer'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_organization on public.users using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_users_email on public.users using btree (email) TABLESPACE pg_default;



create table public.users (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid null,
  email character varying(255) not null,
  password character varying(255) not null,
  full_name character varying(255) null,
  role character varying(50) null default 'admin'::character varying,
  is_active boolean null default true,
  last_login timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint users_role_check check (
    (
      (role)::text = any (
        (
          array[
            'super_admin'::character varying,
            'admin'::character varying,
            'staff'::character varying,
            'viewer'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_users_organization on public.users using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_users_email on public.users using btree (email) TABLESPACE pg_default;



create table public.staff_members (
  id uuid not null default extensions.uuid_generate_v4 (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  full_name character varying(255) not null,
  father_name character varying(255) not null,
  cnic_no character varying(20) not null,
  employee_id character varying(100) not null,
  department_section character varying(255) not null,
  designation character varying(255) not null,
  contact_number character varying(20) not null,
  residential_address text not null,
  date_of_birth date null,
  duty_shift character varying(50) not null,
  membership_type character varying(50) not null,
  meal_timing_preference character varying(50) [] not null,
  food_preference character varying(50) not null,
  food_allergies_medical_needs text null,
  emergency_contact_name character varying(255) null,
  emergency_contact_number character varying(20) null,
  fee_payment_method character varying(50) not null,
  fee_payment_other_details text null,
  complaint_policy_acknowledged boolean null default false,
  membership_id character varying(100) null,
  membership_start_date date null,
  fee_amount numeric(10, 2) null,
  additional_discount numeric(10, 2) null,
  receipt_no character varying(100) null,
  status character varying(50) null default 'pending'::character varying,
  email_address text null,
  communication_consent boolean null default false,
  has_food_allergies boolean null default false,
  constraint staff_members_pkey primary key (id),
  constraint staff_members_employee_id_key unique (employee_id),
  constraint staff_members_cnic_no_key unique (cnic_no),
  constraint staff_members_food_preference_check check (
    (
      (food_preference)::text = any (
        (
          array[
            'vegetarian'::character varying,
            'non_vegetarian'::character varying,
            'both'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_members_membership_type_check check (
    (
      (membership_type)::text = any (
        (
          array[
            'full_time'::character varying,
            'partial'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_members_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'approved'::character varying,
            'rejected'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_members_duty_shift_check check (
    (
      (duty_shift)::text = any (
        (
          array[
            'morning'::character varying,
            'evening'::character varying,
            'night'::character varying,
            'full_day'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint staff_members_fee_payment_method_check check (
    (
      (fee_payment_method)::text = any (
        (
          array[
            'cash'::character varying,
            'online'::character varying,
            'other'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_staff_employee_id on public.staff_members using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_staff_cnic on public.staff_members using btree (cnic_no) TABLESPACE pg_default;

create index IF not exists idx_staff_status on public.staff_members using btree (status) TABLESPACE pg_default;

create trigger update_staff_members_updated_at BEFORE
update on staff_members for EACH row
execute FUNCTION update_updated_at_column ();





create table public.organizations (
  id uuid not null default extensions.uuid_generate_v4 (),
  name character varying(255) not null,
  slug character varying(100) not null,
  logo_url text null,
  address text null,
  contact_phone character varying(20) null,
  contact_email character varying(255) null,
  settings jsonb null default '{}'::jsonb,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  lost_card_fee numeric(10, 2) null default 500,
  support_phone character varying(50) null,
  support_whatsapp character varying(50) null,
  constraint organizations_pkey primary key (id),
  constraint organizations_slug_key unique (slug)
) TABLESPACE pg_default;

create trigger update_organizations_updated_at BEFORE
update on organizations for EACH row
execute FUNCTION update_updated_at_column ();



create table public.member_meal_packages (
  id uuid not null default extensions.uuid_generate_v4 (),
  member_id uuid not null,
  member_type character varying(20) not null,
  breakfast_enabled boolean null default false,
  breakfast_days text[] null default '{}'::text[],
  breakfast_meals_per_month integer null default 1,
  lunch_enabled boolean null default false,
  lunch_days text[] null default '{}'::text[],
  lunch_meals_per_month integer null default 1,
  dinner_enabled boolean null default false,
  dinner_days text[] null default '{}'::text[],
  dinner_meals_per_month integer null default 1,
  price numeric(10, 2) not null default 0,
  is_active boolean null default true,
  valid_from date null default CURRENT_DATE,
  valid_until date null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint member_meal_packages_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_member_meal_packages_member on public.member_meal_packages using btree (member_id, member_type) TABLESPACE pg_default;

create index IF not exists idx_member_meal_packages_active on public.member_meal_packages using btree (is_active) TABLESPACE pg_default;

create trigger update_member_meal_packages_updated_at BEFORE
update on member_meal_packages for EACH row
execute FUNCTION update_updated_at_column ();





create table public.meal_tokens (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid not null,
  member_id uuid not null,
  token_no integer not null,
  meal_type character varying(20) not null,
  token_date date not null,
  token_time time without time zone not null,
  status character varying(20) null default 'PENDING'::character varying,
  collected_at timestamp with time zone null,
  collected_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint meal_tokens_pkey primary key (id),
  constraint meal_tokens_member_id_fkey foreign KEY (member_id) references members (id) on delete CASCADE,
  constraint meal_tokens_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint meal_tokens_meal_type_check check (
    (
      (meal_type)::text = any (
        (
          array[
            'BREAKFAST'::character varying,
            'LUNCH'::character varying,
            'DINNER'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint meal_tokens_status_check check (
    (
      (status)::text = any (
        (
          array[
            'PENDING'::character varying,
            'COLLECTED'::character varying,
            'CANCELLED'::character varying,
            'EXPIRED'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_tokens_organization on public.meal_tokens using btree (organization_id) TABLESPACE pg_default;

create index IF not exists idx_tokens_member on public.meal_tokens using btree (member_id) TABLESPACE pg_default;

create index IF not exists idx_tokens_date on public.meal_tokens using btree (token_date) TABLESPACE pg_default;

create index IF not exists idx_tokens_status on public.meal_tokens using btree (status) TABLESPACE pg_default;

create trigger update_meal_tokens_updated_at BEFORE
update on meal_tokens for EACH row
execute FUNCTION update_updated_at_column ();


create table public.meal_selections (
  id uuid not null default gen_random_uuid (),
  member_id uuid not null,
  member_type text not null,
  date date not null,
  breakfast_needed boolean null default true,
  lunch_needed boolean null default true,
  dinner_needed boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint meal_selections_pkey primary key (id),
  constraint meal_selections_member_id_member_type_date_key unique (member_id, member_type, date)
) TABLESPACE pg_default;


create table public.meal_reports (
  id uuid not null default gen_random_uuid (),
  member_id uuid not null,
  member_type character varying(50) not null,
  member_name character varying(255) null,
  meal_type character varying(20) not null,
  report_date date not null,
  reason text null,
  status character varying(20) null default 'PENDING'::character varying,
  admin_notes text null,
  resolved_at timestamp with time zone null,
  resolved_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint meal_reports_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_meal_reports_member on public.meal_reports using btree (member_id, member_type) TABLESPACE pg_default;

create index IF not exists idx_meal_reports_date on public.meal_reports using btree (report_date) TABLESPACE pg_default;

create index IF not exists idx_meal_reports_status on public.meal_reports using btree (status) TABLESPACE pg_default;



create table public.faculty_members (
  id uuid not null default extensions.uuid_generate_v4 (),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  full_name character varying(255) not null,
  department character varying(255) not null,
  designation character varying(255) not null,
  employee_id character varying(100) not null,
  contact_number character varying(20) not null,
  email_address character varying(255) not null,
  date_of_birth date null,
  membership_type character varying(50) not null,
  preferred_meal_plan character varying(50) not null,
  food_preference character varying(50) not null,
  has_food_allergies boolean null default false,
  food_allergies_details text null,
  communication_consent boolean null default false,
  complaint_policy_acknowledged boolean null default false,
  membership_id character varying(100) null,
  fee_category character varying(50) null,
  receipt_no character varying(100) null,
  status character varying(50) null default 'pending'::character varying,
  father_name character varying(255) null,
  cnic_no character varying(15) null,
  residential_address text null,
  constraint faculty_members_pkey primary key (id),
  constraint faculty_members_employee_id_key unique (employee_id),
  constraint faculty_members_food_preference_check check (
    (
      (food_preference)::text = any (
        (
          array[
            'vegetarian'::character varying,
            'non_vegetarian'::character varying,
            'both'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint faculty_members_preferred_meal_plan_check check (
    (
      (preferred_meal_plan)::text = any (
        (
          array[
            'lunch'::character varying,
            'dinner'::character varying,
            'full_day'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint faculty_members_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'approved'::character varying,
            'rejected'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint faculty_members_membership_type_check check (
    (
      (membership_type)::text = any (
        (
          array[
            'full_time'::character varying,
            'partial'::character varying,
            'day_to_day'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint faculty_members_fee_category_check check (
    (
      (fee_category)::text = any (
        (
          array[
            'subsidized'::character varying,
            'standard'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_faculty_email on public.faculty_members using btree (email_address) TABLESPACE pg_default;

create index IF not exists idx_faculty_employee_id on public.faculty_members using btree (employee_id) TABLESPACE pg_default;

create index IF not exists idx_faculty_status on public.faculty_members using btree (status) TABLESPACE pg_default;

create trigger update_faculty_members_updated_at BEFORE
update on faculty_members for EACH row
execute FUNCTION update_updated_at_column ();



create table public.daily_token_counter (
  id uuid not null default extensions.uuid_generate_v4 (),
  organization_id uuid not null,
  counter_date date not null,
  last_token_no integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint daily_token_counter_pkey primary key (id),
  constraint daily_token_counter_organization_id_counter_date_key unique (organization_id, counter_date),
  constraint daily_token_counter_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_daily_counter_org_date on public.daily_token_counter using btree (organization_id, counter_date) TABLESPACE pg_default;