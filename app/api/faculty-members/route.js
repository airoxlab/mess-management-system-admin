import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// Helper function to sanitize data - convert empty strings to null for numeric and date fields
const sanitizeData = (data) => {
  const numericFields = ['fee_received', 'fee_amount', 'additional_discount'];
  const dateFields = ['date_of_birth', 'membership_start_date'];
  const optionalFields = ['medical_dietary_requirements', 'special_requirements', 'notes', 'photo_url', 'food_allergies_details'];
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

// GET all faculty members
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('faculty_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,employee_id.ilike.%${search}%,email_address.ilike.%${search}%,membership_id.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ members: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching faculty members:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new faculty member
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      'full_name',
      'department',
      'designation',
      'employee_id',
      'contact_number',
      'email_address',
      'membership_type',
      'preferred_meal_plan',
      'food_preference',
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
      .from('faculty_members')
      .insert([sanitizedBody])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('employee_id')) {
          return NextResponse.json(
            { error: 'A faculty member with this employee ID already exists' },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ member: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating faculty member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
