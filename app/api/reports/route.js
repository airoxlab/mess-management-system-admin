import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// Force dynamic rendering since this route uses request.url
export const dynamic = 'force-dynamic';

// GET - Generate reports
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'daily';
    const startDate = searchParams.get('start') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('end') || new Date().toISOString().split('T')[0];

    // Fetch tokens for the period
    const { data: tokens, error: tokensError } = await supabase
      .from('meal_tokens')
      .select('*, member:members(id, name, member_id)')
      .gte('token_date', startDate)
      .lte('token_date', endDate)
      .order('created_at', { ascending: false });

    if (tokensError) {
      throw tokensError;
    }

    // Fetch transactions for the period
    const { data: transactions, error: txnError } = await supabase
      .from('transactions')
      .select('*, member:members(id, name, member_id)')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false });

    if (txnError) {
      throw txnError;
    }

    // Calculate stats
    const totalTokens = tokens?.length || 0;
    const collectedTokens = tokens?.filter((t) => t.status === 'COLLECTED').length || 0;
    const pendingTokens = tokens?.filter((t) => t.status === 'PENDING').length || 0;

    // Unique members who used tokens
    const uniqueMemberIds = new Set(tokens?.map((t) => t.member_id) || []);

    // Total revenue from top-ups
    const totalRevenue = transactions
      ?.filter((t) => t.type === 'TOPUP' && t.amount)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

    // Total meals topped up
    const totalMealsTopup = transactions
      ?.filter((t) => t.type === 'TOPUP')
      .reduce((sum, t) => sum + t.meals_change, 0) || 0;

    const stats = {
      totalTokens,
      collectedTokens,
      pendingTokens,
      uniqueMembers: uniqueMemberIds.size,
      totalRevenue,
      totalMealsTopup,
    };

    return NextResponse.json({
      stats,
      tokens: tokens || [],
      transactions: transactions || [],
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate report' },
      { status: 500 }
    );
  }
}
