import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET single staff member
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('staff_members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ member: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update staff member
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.created_at;
    delete body.updated_at;

    const { data, error } = await supabase
      .from('staff_members')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
      }
      if (error.code === '23505') {
        if (error.message.includes('employee_id')) {
          return NextResponse.json(
            { error: 'A staff member with this employee ID already exists' },
            { status: 400 }
          );
        }
        if (error.message.includes('cnic_no')) {
          return NextResponse.json(
            { error: 'A staff member with this CNIC already exists' },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ member: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating staff member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE staff member
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('staff_members')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Staff member deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting staff member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
