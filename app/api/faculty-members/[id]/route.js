import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET single faculty member
export async function GET(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = await params;

    const { data, error } = await supabase
      .from('faculty_members')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ member: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching faculty member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update faculty member
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
      .from('faculty_members')
      .update(body)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Faculty member not found' }, { status: 404 });
      }
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

    return NextResponse.json({ member: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating faculty member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE faculty member
export async function DELETE(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = await params;

    const { error } = await supabase
      .from('faculty_members')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) throw error;

    return NextResponse.json({ message: 'Faculty member deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting faculty member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
