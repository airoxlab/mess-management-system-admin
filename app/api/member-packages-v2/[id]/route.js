import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET single package by ID
export async function GET(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = params;

    const { data: pkg, error } = await supabase
      .from('member_packages')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw error;

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Get disabled days for partial_full_time
    if (pkg.package_type === 'partial_full_time') {
      const { data: disabledDays } = await supabase
        .from('package_disabled_days')
        .select('disabled_date')
        .eq('package_id', id);

      pkg.disabled_days = disabledDays?.map(d => d.disabled_date) || [];
    }

    // Get consumption history
    const { data: consumptionHistory } = await supabase
      .from('meal_consumption_history')
      .select('*')
      .eq('package_id', id)
      .order('consumed_at', { ascending: false });

    pkg.consumption_history = consumptionHistory || [];

    // Get transactions for daily_basis
    if (pkg.package_type === 'daily_basis') {
      const { data: transactions } = await supabase
        .from('daily_basis_transactions')
        .select('*')
        .eq('package_id', id)
        .order('created_at', { ascending: false });

      pkg.transactions = transactions || [];
    }

    // Get full history for this member (all package types)
    const { data: packageHistory } = await supabase
      .from('package_history')
      .select('*')
      .eq('member_id', pkg.member_id)
      .eq('member_type', pkg.member_type)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: true });

    pkg.history = packageHistory || [];

    return NextResponse.json({ package: pkg }, { status: 200 });
  } catch (error) {
    console.error('Error fetching package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update package
export async function PUT(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = params;
    const body = await request.json();

    // Get existing package
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

    // RULE: Date overlap prevention when editing full_time/partial_full_time packages
    const packageType = body.package_type || existingPackage.package_type;
    if (['full_time', 'partial_full_time'].includes(packageType)) {
      const startDate = body.start_date || existingPackage.start_date;
      const endDate = body.end_date || existingPackage.end_date;

      if (startDate && endDate) {
        // Check for date overlap with OTHER packages (exclude current package being edited)
        const { data: otherPackages } = await supabase
          .from('member_packages')
          .select('id, package_type, status, start_date, end_date')
          .eq('organization_id', orgId)
          .eq('member_id', existingPackage.member_id)
          .eq('member_type', existingPackage.member_type)
          .in('package_type', ['full_time', 'partial_full_time'])
          .neq('id', id) // Exclude the package being edited
          .not('start_date', 'is', null)
          .not('end_date', 'is', null);

        if (otherPackages && otherPackages.length > 0) {
          for (const pkg of otherPackages) {
            const existingStart = pkg.start_date;
            const existingEnd = pkg.end_date;

            // Check overlap: new_start <= existing_end AND new_end >= existing_start
            if (startDate <= existingEnd && endDate >= existingStart) {
              return NextResponse.json(
                {
                  error: `Date range conflicts with existing ${pkg.package_type} package (${existingStart} to ${existingEnd}). Please choose non-overlapping dates.`,
                  conflictingPackage: {
                    id: pkg.id,
                    type: pkg.package_type,
                    start_date: existingStart,
                    end_date: existingEnd,
                    status: pkg.status
                  }
                },
                { status: 400 }
              );
            }
          }
        }
      }
    }

    // Extract disabled_days and disabled_meals from body
    const { disabled_days, disabled_meals, ...updateData } = body;

    // Include disabled_meals if provided (stored as JSONB)
    if (disabled_meals !== undefined) {
      updateData.disabled_meals = Object.keys(disabled_meals).length > 0 ? disabled_meals : {};
    }

    // Update package
    const { data: updatedPackage, error: updateError } = await supabase
      .from('member_packages')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update disabled days for partial_full_time
    if (existingPackage.package_type === 'partial_full_time' && disabled_days !== undefined) {
      // Delete existing disabled days
      await supabase
        .from('package_disabled_days')
        .delete()
        .eq('package_id', id);

      // Insert new disabled days
      if (disabled_days && disabled_days.length > 0) {
        const disabledDaysData = disabled_days.map(date => ({
          package_id: id,
          disabled_date: date,
          organization_id: orgId,
        }));

        await supabase
          .from('package_disabled_days')
          .insert(disabledDaysData);
      }

      updatedPackage.disabled_days = disabled_days || [];
    }

    return NextResponse.json({ package: updatedPackage }, { status: 200 });
  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE package
export async function DELETE(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = params;

    // Get existing package
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

    // Delete associated records (cascade should handle this, but being explicit)
    await supabase.from('package_disabled_days').delete().eq('package_id', id);
    await supabase.from('meal_consumption_history').delete().eq('package_id', id);
    await supabase.from('daily_basis_transactions').delete().eq('package_id', id);
    await supabase.from('package_history').delete().eq('package_id', id);

    // Delete the package
    const { error: deleteError } = await supabase
      .from('member_packages')
      .delete()
      .eq('id', id)
      .eq('organization_id', orgId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ message: 'Package deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
