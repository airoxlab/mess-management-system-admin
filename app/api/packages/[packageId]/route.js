import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET - Get single package
export async function GET(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { packageId } = params;

    const { data: pkg, error } = await supabase
      .from('packages')
      .select('*')
      .eq('id', packageId)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      throw error;
    }

    if (!pkg) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch package' },
      { status: 500 }
    );
  }
}

// PUT - Update package
export async function PUT(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { packageId } = params;
    const body = await request.json();
    const { name, meals_count, price, is_active } = body;

    const updates = {};

    if (name !== undefined) updates.name = name;
    if (meals_count !== undefined) updates.meals_count = parseInt(meals_count);
    if (price !== undefined) updates.price = parseFloat(price);
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: pkg, error } = await supabase
      .from('packages')
      .update(updates)
      .eq('id', packageId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ package: pkg });
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update package' },
      { status: 500 }
    );
  }
}

// DELETE - Delete package
export async function DELETE(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { packageId } = params;

    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', packageId)
      .eq('organization_id', orgId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete package' },
      { status: 500 }
    );
  }
}
