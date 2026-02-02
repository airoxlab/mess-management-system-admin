import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET single student member
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from('student_members')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student member not found' }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ member: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching student member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update student member
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body.id;
    delete body.created_at;
    delete body.updated_at;

    const { data, error } = await supabase
      .from('student_members')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Student member not found' }, { status: 404 });
      }
      if (error.code === '23505') {
        if (error.message.includes('roll_number')) {
          return NextResponse.json(
            { error: 'A student with this roll number already exists' },
            { status: 400 }
          );
        }
        if (error.message.includes('student_cnic')) {
          return NextResponse.json(
            { error: 'A student with this CNIC already exists' },
            { status: 400 }
          );
        }
      }
      throw error;
    }

    return NextResponse.json({ member: data }, { status: 200 });
  } catch (error) {
    console.error('Error updating student member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE student member
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('student_members')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Student member deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting student member:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
