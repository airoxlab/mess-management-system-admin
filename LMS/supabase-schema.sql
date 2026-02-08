-- =====================================================
-- SUPABASE SCHEMA FOR CENTRAL CANTEEN MEMBERSHIP FORMS
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- FACULTY TABLE
-- =====================================================
CREATE TABLE faculty_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    department VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    employee_id VARCHAR(100) NOT NULL UNIQUE,
    contact_number VARCHAR(20) NOT NULL,
    email_address VARCHAR(255) NOT NULL,
    date_of_birth DATE,

    -- Membership Details
    membership_type VARCHAR(50) NOT NULL CHECK (membership_type IN ('full_time', 'partial', 'day_to_day')),
    preferred_meal_plan VARCHAR(50) NOT NULL CHECK (preferred_meal_plan IN ('lunch', 'dinner', 'full_day')),
    food_preference VARCHAR(50) NOT NULL CHECK (food_preference IN ('vegetarian', 'non_vegetarian', 'both')),

    -- Dietary Information
    has_food_allergies BOOLEAN DEFAULT FALSE,
    food_allergies_details TEXT,

    -- Consent
    communication_consent BOOLEAN DEFAULT FALSE,
    complaint_policy_acknowledged BOOLEAN DEFAULT FALSE,

    -- Office Use
    membership_id VARCHAR(100),
    fee_category VARCHAR(50) CHECK (fee_category IN ('subsidized', 'standard')),
    receipt_no VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- =====================================================
-- STAFF TABLE
-- =====================================================
CREATE TABLE staff_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    father_name VARCHAR(255) NOT NULL,
    cnic_no VARCHAR(20) NOT NULL UNIQUE,
    employee_id VARCHAR(100) NOT NULL UNIQUE,
    department_section VARCHAR(255) NOT NULL,
    designation VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    residential_address TEXT NOT NULL,
    date_of_birth DATE,

    -- Work Details
    duty_shift VARCHAR(50) NOT NULL CHECK (duty_shift IN ('morning', 'evening', 'night', 'full_day')),

    -- Membership Details
    membership_type VARCHAR(50) NOT NULL CHECK (membership_type IN ('full_time', 'partial')),
    meal_timing_preference VARCHAR(50)[] NOT NULL,
    food_preference VARCHAR(50) NOT NULL CHECK (food_preference IN ('vegetarian', 'non_vegetarian', 'both')),

    -- Dietary & Medical Information
    food_allergies_medical_needs TEXT,

    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_number VARCHAR(20),

    -- Payment
    fee_payment_method VARCHAR(50) NOT NULL CHECK (fee_payment_method IN ('cash', 'online', 'other')),
    fee_payment_other_details TEXT,

    -- Consent
    complaint_policy_acknowledged BOOLEAN DEFAULT FALSE,

    -- Office Use
    membership_id VARCHAR(100),
    membership_start_date DATE,
    fee_amount DECIMAL(10, 2),
    additional_discount DECIMAL(10, 2),
    receipt_no VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- =====================================================
-- STUDENTS TABLE
-- =====================================================
CREATE TABLE student_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Personal Information
    full_name VARCHAR(255) NOT NULL,
    guardian_name VARCHAR(255) NOT NULL,
    student_cnic VARCHAR(20) NOT NULL UNIQUE,
    roll_number VARCHAR(100) NOT NULL UNIQUE,
    department_program VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female')),
    contact_number VARCHAR(20),
    email_address VARCHAR(255),
    residential_address TEXT NOT NULL,

    -- Academic Details
    hostel_day_scholar VARCHAR(50) NOT NULL CHECK (hostel_day_scholar IN ('hostel', 'day_scholar')),

    -- Membership Details
    membership_type VARCHAR(50) NOT NULL CHECK (membership_type IN ('full_time', 'partial')),
    preferred_meal_plan VARCHAR(50)[] NOT NULL,
    food_preference VARCHAR(50) NOT NULL CHECK (food_preference IN ('vegetarian', 'non_vegetarian', 'both')),

    -- Dietary & Medical Information
    has_food_allergies BOOLEAN DEFAULT FALSE,
    food_allergies_details TEXT,
    medical_conditions TEXT,

    -- Emergency Contact
    emergency_contact_name VARCHAR(255) NOT NULL,
    emergency_contact_number VARCHAR(20) NOT NULL,

    -- Payment
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'online', 'other')),
    payment_other_details TEXT,

    -- Consent
    complaint_policy_acknowledged BOOLEAN DEFAULT FALSE,

    -- Office Use
    membership_id VARCHAR(100),
    fee_received DECIMAL(10, 2),
    receipt_no VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- =====================================================
-- INDEXES FOR BETTER PERFORMANCE
-- =====================================================
CREATE INDEX idx_faculty_employee_id ON faculty_members(employee_id);
CREATE INDEX idx_faculty_email ON faculty_members(email_address);
CREATE INDEX idx_faculty_status ON faculty_members(status);

CREATE INDEX idx_staff_employee_id ON staff_members(employee_id);
CREATE INDEX idx_staff_cnic ON staff_members(cnic_no);
CREATE INDEX idx_staff_status ON staff_members(status);

CREATE INDEX idx_student_roll_number ON student_members(roll_number);
CREATE INDEX idx_student_cnic ON student_members(student_cnic);
CREATE INDEX idx_student_status ON student_members(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE faculty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_members ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for form submissions)
CREATE POLICY "Allow anonymous insert" ON faculty_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON staff_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON student_members FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read all records
CREATE POLICY "Allow authenticated read" ON faculty_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON staff_members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated read" ON student_members FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_faculty_members_updated_at
    BEFORE UPDATE ON faculty_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_members_updated_at
    BEFORE UPDATE ON staff_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_members_updated_at
    BEFORE UPDATE ON student_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
