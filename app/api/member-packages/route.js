import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET all member meal packages
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const memberType = searchParams.get('member_type');
    const isActive = searchParams.get('is_active');

    let query = supabase
      .from('member_meal_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (memberType && memberType !== 'all') {
      query = query.eq('member_type', memberType);
    }

    if (isActive !== null && isActive !== 'all') {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ packages: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching member packages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new member meal package
export async function POST(request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.member_id) {
      return NextResponse.json({ error: 'Member is required' }, { status: 400 });
    }
    if (!body.member_type) {
      return NextResponse.json({ error: 'Member type is required' }, { status: 400 });
    }

    // Check if member already has an active package
    const { data: existingPackage } = await supabase
      .from('member_meal_packages')
      .select('id')
      .eq('member_id', body.member_id)
      .eq('member_type', body.member_type)
      .eq('is_active', true)
      .single();

    if (existingPackage) {
      return NextResponse.json(
        { error: 'This member already has an active meal package. Please deactivate or edit the existing one.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('member_meal_packages')
      .insert([body])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ package: data }, { status: 201 });
  } catch (error) {
    console.error('Error creating member package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
