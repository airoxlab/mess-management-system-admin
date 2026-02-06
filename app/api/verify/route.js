import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET - Search/verify token
export async function GET(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { searchParams } = new URL(request.url);
    const tokenQuery = searchParams.get('token');
    const recent = searchParams.get('recent');

    // Return recent collected tokens
    if (recent) {
      const today = new Date().toISOString().split('T')[0];

      const { data: tokens, error } = await supabase
        .from('meal_tokens')
        .select('*, member:members(id, name, member_id)')
        .eq('organization_id', orgId)
        .eq('token_date', today)
        .eq('status', 'COLLECTED')
        .order('collected_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return NextResponse.json({ tokens });
    }

    if (!tokenQuery) {
      return NextResponse.json(
        { error: 'Token number or ID is required' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Search by token number or UUID
    let query = supabase
      .from('meal_tokens')
      .select('*, member:members(id, name, member_id)')
      .eq('organization_id', orgId)
      .eq('token_date', today);

    // Check if it's a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(tokenQuery)) {
      query = query.eq('id', tokenQuery);
    } else {
      // Assume it's a token number
      const tokenNo = parseInt(tokenQuery.replace(/^#/, ''));
      if (isNaN(tokenNo)) {
        return NextResponse.json(
          { error: 'Invalid token number' },
          { status: 400 }
        );
      }
      query = query.eq('token_no', tokenNo);
    }

    const { data: token, error } = await query.single();

    if (error || !token) {
      return NextResponse.json(
        { error: 'Token not found for today' },
        { status: 404 }
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify token' },
      { status: 500 }
    );
  }
}

// POST - Collect token
export async function POST(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const body = await request.json();
    const { tokenId } = body;

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    // Get token
    const { data: existingToken, error: fetchError } = await supabase
      .from('meal_tokens')
      .select('*')
      .eq('id', tokenId)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !existingToken) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Check if already collected
    if (existingToken.status === 'COLLECTED') {
      return NextResponse.json(
        { error: 'Token has already been collected' },
        { status: 400 }
      );
    }

    // Check if token is for today
    const today = new Date().toISOString().split('T')[0];
    if (existingToken.token_date !== today) {
      return NextResponse.json(
        { error: 'Token is not valid for today' },
        { status: 400 }
      );
    }

    // Update token status
    const { data: token, error: updateError } = await supabase
      .from('meal_tokens')
      .update({
        status: 'COLLECTED',
        collected_at: new Date().toISOString(),
      })
      .eq('id', tokenId)
      .eq('organization_id', orgId)
      .select('*, member:members(id, name, member_id)')
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error collecting token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to collect token' },
      { status: 500 }
    );
  }
}
