import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// PUT update a menu category
export async function PUT(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { categoryId } = await params;
    const body = await request.json();
    const { name, description, sort_order, is_active } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order) || 0;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: category, error } = await supabase
      .from('menu_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category }, { status: 200 });
  } catch (error) {
    console.error('Error updating menu category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update menu category' },
      { status: 500 }
    );
  }
}

// DELETE a menu category (cascades to menu items)
export async function DELETE(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { categoryId } = await params;

    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', categoryId)
      .eq('organization_id', orgId);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting menu category:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete menu category' },
      { status: 500 }
    );
  }
}
