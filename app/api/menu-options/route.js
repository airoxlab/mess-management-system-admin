import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET all menu options (with optional date and meal_type filters)
export async function GET(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const mealType = searchParams.get('meal_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('menu_options')
      .select('*')
      .eq('organization_id', orgId)
      .order('date', { ascending: true })
      .order('meal_type', { ascending: true })
      .order('sort_order', { ascending: true });

    // Filter by specific date
    if (date) {
      query = query.eq('date', date);
    }

    // Filter by date range (for week view)
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    // Filter by meal type
    if (mealType && mealType !== 'all') {
      query = query.eq('meal_type', mealType);
    }

    const { data: options, error } = await query;

    if (error) throw error;

    return NextResponse.json({ options }, { status: 200 });
  } catch (error) {
    console.error('Error fetching menu options:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch menu options' },
      { status: 500 }
    );
  }
}

// POST create a new menu option
export async function POST(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const body = await request.json();
    const { meal_type, date, option_name, option_description, is_available, sort_order } = body;

    // Validation
    if (!meal_type || !['breakfast', 'lunch', 'dinner'].includes(meal_type)) {
      return NextResponse.json(
        { error: 'Valid meal type is required (breakfast, lunch, or dinner)' },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    if (!option_name || !option_name.trim()) {
      return NextResponse.json(
        { error: 'Option name is required' },
        { status: 400 }
      );
    }

    const { data: option, error } = await supabase
      .from('menu_options')
      .insert([{
        organization_id: orgId,
        meal_type,
        date,
        option_name: option_name.trim(),
        option_description: option_description || null,
        is_available: is_available !== false,
        sort_order: parseInt(sort_order) || 0,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ option }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu option:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create menu option' },
      { status: 500 }
    );
  }
}
