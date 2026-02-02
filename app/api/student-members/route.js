import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// Helper function to sanitize data - convert empty strings to null for numeric and date fields
const sanitizeData = (data) => {
  const numericFields = ['fee_received', 'fee_amount', 'additional_discount'];
  const dateFields = ['date_of_birth', 'membership_start_date'];
  const optionalFields = ['medical_dietary_requirements', 'special_requirements', 'notes', 'photo_url', 'food_allergies_details', 'medical_conditions', 'payment_other_details', 'contact_number', 'email_address'];
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    if (sanitized[key] === '') {
      // Convert empty strings to null for numeric, date, and optional fields
      if (numericFields.includes(key) || dateFields.includes(key) || optionalFields.includes(key)) {
        sanitized[key] = null;
      }
    }
  }

  return sanitized;
};

// GET all student members
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('student_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,roll_number.ilike.%${search}%,student_cnic.ilike.%${search}%,membership_id.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ members: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student members:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new student member
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'full_name',
      'guardian_name',
      'student_cnic',
      'roll_number',
      'department_program',
      'date_of_birth',
      'gender',
      'residential_address',
      'hostel_day_scholar',
      'membership_type',
      'preferred_meal_plan',
      'food_preference',
      'emergency_contact_name',
      'emergency_contact_number',
      'payment_method',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `${field.replace(/_/g, ' ')} is required` },
          { status: 400 }
        );
      }
    }

    // Sanitize data before inserting
    const sanitizedBody = sanitizeData(body);

    const { data, error } = await supabase
      .from('student_members')
      .insert([sanitizedBody])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('roll_number')) {
          return NextResponse.json(
            { error: 'A student with this roll number already exists' },
            { status: 400 }
          );
        }
        if (error.message.includes('student_cnic')) {
          return NextResponse.json(
            { error: 'A student with this CNIC already exists' },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ member: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating student member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
