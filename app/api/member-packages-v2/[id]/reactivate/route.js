import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// POST reactivate a package
export async function POST(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = params;

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

    // Validate: Can only reactivate deactivated packages
    if (existingPackage.status !== 'deactivated') {
      return NextResponse.json(
        { error: `Cannot reactivate a package with status "${existingPackage.status}". Only deactivated packages can be reactivated.` },
        { status: 400 }
      );
    }

    // Check if package has expired dates (for full_time/partial_full_time)
    if (['full_time', 'partial_full_time'].includes(existingPackage.package_type)) {
      const today = new Date().toISOString().split('T')[0];
      if (existingPackage.end_date && existingPackage.end_date < today) {
        return NextResponse.json(
          { error: 'Cannot reactivate an expired package. The end date has passed. Please renew the package instead.' },
          { status: 400 }
        );
      }
    }

    // Check if member has another active package (strict one-package-per-member rule)
    const { data: otherActivePackage } = await supabase
      .from('member_packages')
      .select('id, package_type, status')
      .eq('organization_id', orgId)
      .eq('member_id', existingPackage.member_id)
      .eq('member_type', existingPackage.member_type)
      .eq('is_active', true)
      .eq('status', 'active')
      .neq('id', id) // Exclude current package
      .maybeSingle();

    if (otherActivePackage) {
      return NextResponse.json(
        { error: `This member already has another active ${otherActivePackage.package_type} package. Please deactivate it first before reactivating this one.` },
        { status: 400 }
      );
    }

    // Check for date overlaps (for full_time/partial_full_time)
    if (['full_time', 'partial_full_time'].includes(existingPackage.package_type) &&
        existingPackage.start_date && existingPackage.end_date) {
      const { data: overlappingPackages } = await supabase
        .from('member_packages')
        .select('id, package_type, status, start_date, end_date')
        .eq('organization_id', orgId)
        .eq('member_id', existingPackage.member_id)
        .eq('member_type', existingPackage.member_type)
        .in('package_type', ['full_time', 'partial_full_time'])
        .eq('is_active', true)
        .eq('status', 'active')
        .neq('id', id)
        .not('start_date', 'is', null)
        .not('end_date', 'is', null);

      if (overlappingPackages && overlappingPackages.length > 0) {
        for (const pkg of overlappingPackages) {
          // Check overlap
          if (existingPackage.start_date <= pkg.end_date && existingPackage.end_date >= pkg.start_date) {
            return NextResponse.json(
              { error: `Cannot reactivate: Date range conflicts with another active ${pkg.package_type} package (${pkg.start_date} to ${pkg.end_date}).` },
              { status: 400 }
            );
          }
        }
      }
    }

    // Update package to active
    const { data: reactivatedPackage, error: updateError } = await supabase
      .from('member_packages')
      .update({
        status: 'active',
        is_active: true,
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
      action: 'reactivated',
      package_type: existingPackage.package_type,
      total_breakfast: existingPackage.total_breakfast,
      total_lunch: existingPackage.total_lunch,
      total_dinner: existingPackage.total_dinner,
      consumed_breakfast: existingPackage.consumed_breakfast,
      consumed_lunch: existingPackage.consumed_lunch,
      consumed_dinner: existingPackage.consumed_dinner,
      balance: existingPackage.balance,
      notes: 'Package reactivated by admin',
    }]);

    return NextResponse.json({
      message: 'Package reactivated successfully',
      package: reactivatedPackage,
    }, { status: 200 });
  } catch (error) {
    console.error('Error reactivating package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
