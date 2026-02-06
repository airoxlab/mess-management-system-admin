import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// POST add deposit to daily_basis package
export async function POST(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = params;
    const body = await request.json();
    const { amount, description } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid deposit amount is required' }, { status: 400 });
    }

    // Get the package
    const { data: pkg, error: fetchError } = await supabase
      .from('member_packages')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError) throw fetchError;

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Verify it's a daily_basis package
    if (pkg.package_type !== 'daily_basis') {
      return NextResponse.json({ error: 'Deposits can only be added to daily basis packages' }, { status: 400 });
    }

    // Check if package is active
    if (!pkg.is_active || pkg.status !== 'active') {
      return NextResponse.json({ error: 'This package is not active' }, { status: 400 });
    }

    const newBalance = (pkg.balance || 0) + amount;

    // Update the package balance
    const { error: updateError } = await supabase
      .from('member_packages')
      .update({ balance: newBalance })
      .eq('id', id);

    if (updateError) throw updateError;

    // Create transaction record
    await supabase.from('daily_basis_transactions').insert([{
      package_id: id,
      member_id: pkg.member_id,
      transaction_type: 'deposit',
      amount,
      balance_before: pkg.balance || 0,
      balance_after: newBalance,
      description: description || 'Deposit',
      organization_id: orgId,
    }]);

    // Get updated package
    const { data: updatedPackage } = await supabase
      .from('member_packages')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({
      message: 'Deposit added successfully',
      package: updatedPackage,
      transaction: {
        amount,
        balance_before: pkg.balance || 0,
        balance_after: newBalance,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error adding deposit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
