import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET all menu categories
export async function GET(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { data: categories, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('organization_id', orgId)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ categories }, { status: 200 });
  } catch (error) {
    console.error('Error fetching menu categories:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch menu categories' },
      { status: 500 }
    );
  }
}

// POST create a new menu category
export async function POST(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const body = await request.json();
    const { name, description, sort_order, is_active } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const { data: category, error } = await supabase
      .from('menu_categories')
      .insert([{
        organization_id: orgId,
        name: name.trim(),
        description: description || null,
        sort_order: parseInt(sort_order) || 0,
        is_active: is_active !== false,
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create menu category' },
      { status: 500 }
    );
  }
}
