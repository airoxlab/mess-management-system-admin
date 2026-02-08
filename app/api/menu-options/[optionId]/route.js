import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// PUT update a menu option
export async function PUT(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { optionId } = await params;
    const body = await request.json();
    const { meal_type, date, option_name, option_description, is_available, sort_order } = body;

    const updateData = {};
    if (meal_type !== undefined) updateData.meal_type = meal_type;
    if (date !== undefined) updateData.date = date;
    if (option_name !== undefined) updateData.option_name = option_name.trim();
    if (option_description !== undefined) updateData.option_description = option_description || null;
    if (is_available !== undefined) updateData.is_available = is_available;
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order) || 0;

    const { data: option, error } = await supabase
      .from('menu_options')
      .update(updateData)
      .eq('id', optionId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) throw error;

    if (!option) {
      return NextResponse.json(
        { error: 'Menu option not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ option }, { status: 200 });
  } catch (error) {
    console.error('Error updating menu option:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update menu option' },
      { status: 500 }
    );
  }
}

// DELETE a menu option
export async function DELETE(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { optionId } = await params;

    const { error } = await supabase
      .from('menu_options')
      .delete()
      .eq('id', optionId)
      .eq('organization_id', orgId);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting menu option:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete menu option' },
      { status: 500 }
    );
  }
}
