import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET all menu items (with optional category and meal_type filters)
export async function GET(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const mealType = searchParams.get('meal_type');

    let query = supabase
      .from('menu_items')
      .select('*, menu_categories(id, name)')
      .eq('organization_id', orgId)
      .order('sort_order', { ascending: true });

    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    if (mealType && mealType !== 'all') {
      // Filter by specific meal_type or include items marked as 'all'
      query = query.or(`meal_type.eq.${mealType},meal_type.eq.all`);
    }

    const { data: items, error } = await query;

    if (error) throw error;

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch menu items' },
      { status: 500 }
    );
  }
}

// POST create a new menu item
export async function POST(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const body = await request.json();
    const { name, description, price, category_id, image_url, is_available, sort_order, meal_type } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Item name is required' },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    if (price === undefined || price === null || price === '') {
      return NextResponse.json(
        { error: 'Price is required' },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabase
      .from('menu_items')
      .insert([{
        organization_id: orgId,
        category_id,
        name: name.trim(),
        description: description || null,
        price: parseFloat(price) || 0,
        image_url: image_url || null,
        is_available: is_available !== false,
        sort_order: parseInt(sort_order) || 0,
        meal_type: meal_type || 'all',
      }])
      .select('*, menu_categories(id, name)')
      .single();

    if (error) throw error;

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create menu item' },
      { status: 500 }
    );
  }
}
