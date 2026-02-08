import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// POST deactivate a package
export async function POST(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = params;
    const body = await request.json();
    const { reason } = body; // Optional reason for deactivation

    // Get the existing package
    const { data: existingPackage, error: fetchError } = await supabase
      .from('member_packages')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Validate: Can only deactivate active packages
    if (existingPackage.status !== 'active' || !existingPackage.is_active) {
      return NextResponse.json(
        { error: `Cannot deactivate a package with status "${existingPackage.status}". Only active packages can be deactivated.` },
        { status: 400 }
      );
    }

    // Update package to deactivated
    const { data: deactivatedPackage, error: updateError } = await supabase
      .from('member_packages')
      .update({
        status: 'deactivated',
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Create history record
    await supabase.from('package_history').insert([{
      organization_id: orgId,
      member_id: existingPackage.member_id,
      member_type: existingPackage.member_type,
      package_id: existingPackage.id,
      action: 'deactivated',
      package_type: existingPackage.package_type,
      total_breakfast: existingPackage.total_breakfast,
      total_lunch: existingPackage.total_lunch,
      total_dinner: existingPackage.total_dinner,
      consumed_breakfast: existingPackage.consumed_breakfast,
      consumed_lunch: existingPackage.consumed_lunch,
      consumed_dinner: existingPackage.consumed_dinner,
      balance: existingPackage.balance,
      notes: reason || 'Package deactivated by admin',
    }]);

    return NextResponse.json({
      message: 'Package deactivated successfully',
      package: deactivatedPackage,
      reason: reason || null,
    }, { status: 200 });
  } catch (error) {
    console.error('Error deactivating package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
