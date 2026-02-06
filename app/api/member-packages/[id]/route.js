import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET single member meal package
export async function GET(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = await params;

    const { data, error } = await supabase
      .from('member_meal_packages')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ package: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching member package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update member meal package
export async function PUT(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = await params;
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.created_at;
    delete body.updated_at;

    const { data, error } = await supabase
      .from('member_meal_packages')
      .update(body)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Package not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ package: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating member package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE member meal package
export async function DELETE(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = await params;

    const { error } = await supabase
      .from('member_meal_packages')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;

    return NextResponse.json({ message: 'Package deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting member package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
