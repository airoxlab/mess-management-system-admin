import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// PUT update a menu item
export async function PUT(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { itemId } = await params;
    const body = await request.json();
    const { name, description, price, category_id, image_url, is_available, sort_order } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (price !== undefined) updateData.price = parseFloat(price) || 0;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (image_url !== undefined) updateData.image_url = image_url || null;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order) || 0;

    const { data: item, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('organization_id', orgId)
      .select('*, menu_categories(id, name)')
      .single();

    if (error) throw error;

    if (!item) {
      return NextResponse.json(
        { error: 'Menu item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update menu item' },
      { status: 500 }
    );
  }
}

// DELETE a menu item
export async function DELETE(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { itemId } = await params;

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)
      .eq('organization_id', orgId);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete menu item' },
      { status: 500 }
    );
  }
}
