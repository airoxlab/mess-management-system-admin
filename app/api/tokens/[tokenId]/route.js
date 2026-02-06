import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET - Get single token
export async function GET(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { tokenId } = params;

    const { data: token, error } = await supabase
      .from('meal_tokens')
      .select('*, member:members(id, name, member_id)')
      .eq('id', tokenId)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      throw error;
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch token' },
      { status: 500 }
    );
  }
}

// PUT - Update token (cancel, etc.)
export async function PUT(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { tokenId } = params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const { data: token, error } = await supabase
      .from('meal_tokens')
      .update({ status })
      .eq('id', tokenId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error updating token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update token' },
      { status: 500 }
    );
  }
}
