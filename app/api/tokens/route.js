import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// GET - List tokens
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const status = searchParams.get('status');
    const memberId = searchParams.get('memberId');

    let query = supabase
      .from('meal_tokens')
      .select('*, member:members(id, name, member_id)')
      .eq('token_date', date)
      .order('token_no', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    const { data: tokens, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

// POST - Generate new token
export async function POST(request) {
  try {
    const body = await request.json();
    const { memberId, mealType } = body;

    if (!memberId || !mealType) {
      return NextResponse.json(
        { error: 'Member ID and meal type are required' },
        { status: 400 }
      );
    }

    // Get member and verify
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Check if member is active
    if (member.status !== 'active') {
      return NextResponse.json(
        { error: 'Member account is not active' },
        { status: 400 }
      );
    }

    // Check if card is expired
    if (new Date(member.valid_until) < new Date()) {
      return NextResponse.json(
        { error: 'Member card has expired' },
        { status: 400 }
      );
    }

    // Check meal balance
    if (member.balance_meals <= 0) {
      return NextResponse.json(
        { error: 'Insufficient meal balance' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Check if already has token for this meal today
    const { data: existingToken } = await supabase
      .from('meal_tokens')
      .select('id')
      .eq('member_id', memberId)
      .eq('token_date', today)
      .eq('meal_type', mealType)
      .eq('status', 'PENDING')
      .single();

    if (existingToken) {
      return NextResponse.json(
        { error: 'Already has a pending token for this meal today' },
        { status: 400 }
      );
    }

    // Get or create daily counter
    let { data: counter, error: counterError } = await supabase
      .from('daily_token_counter')
      .select('*')
      .eq('counter_date', today)
      .single();

    if (counterError || !counter) {
      // Create new counter for today
      const { data: newCounter, error: createError } = await supabase
        .from('daily_token_counter')
        .insert([{ counter_date: today, last_token_no: 0 }])
        .select()
        .single();

      if (createError) {
        // Counter might already exist (race condition), try to fetch again
        const { data: existingCounter } = await supabase
          .from('daily_token_counter')
          .select('*')
          .eq('counter_date', today)
          .single();

        counter = existingCounter || { last_token_no: 0, counter_date: today };
      } else {
        counter = newCounter;
      }
    }

    const newTokenNo = (counter?.last_token_no || 0) + 1;

    // Update counter
    await supabase
      .from('daily_token_counter')
      .upsert({
        id: counter?.id,
        counter_date: today,
        last_token_no: newTokenNo,
      });

    // Create token
    const { data: token, error: tokenError } = await supabase
      .from('meal_tokens')
      .insert([
        {
          token_no: newTokenNo,
          member_id: memberId,
          meal_type: mealType,
          token_date: today,
          token_time: new Date().toTimeString().split(' ')[0],
          status: 'PENDING',
        },
      ])
      .select()
      .single();

    if (tokenError) {
      throw tokenError;
    }

    // Deduct meal from balance
    const newBalance = member.balance_meals - 1;
    const { error: updateError } = await supabase
      .from('members')
      .update({ balance_meals: newBalance, updated_at: new Date().toISOString() })
      .eq('id', memberId);

    if (updateError) {
      // Rollback token if balance update fails
      await supabase.from('meal_tokens').delete().eq('id', token.id);
      throw updateError;
    }

    // Create transaction record
    await supabase.from('transactions').insert([
      {
        member_id: memberId,
        type: 'DEDUCTION',
        meals_change: -1,
        balance_after: newBalance,
        token_id: token.id,
        notes: `Token #${newTokenNo} for ${mealType}`,
      },
    ]);

    return NextResponse.json({
      token,
      member: { ...member, balance_meals: newBalance },
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate token' },
      { status: 500 }
    );
  }
}
