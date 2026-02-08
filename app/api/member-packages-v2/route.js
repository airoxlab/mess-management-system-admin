import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET all member packages with the new package type system
export async function GET(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    // Auto-expire packages whose end_date has passed
    const today = new Date().toISOString().split('T')[0];

    // First, find packages that need to be expired (to create history records)
    const { data: expiredPackages } = await supabase
      .from('member_packages')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .eq('status', 'active')
      .in('package_type', ['full_time', 'partial_full_time'])
      .lt('end_date', today);

    if (expiredPackages && expiredPackages.length > 0) {
      // Update them to expired
      const expiredIds = expiredPackages.map(p => p.id);
      await supabase
        .from('member_packages')
        .update({ status: 'expired', is_active: false })
        .in('id', expiredIds);

      // Create history records for each expired package
      const historyRecords = expiredPackages.map(pkg => ({
        organization_id: orgId,
        member_id: pkg.member_id,
        member_type: pkg.member_type,
        package_id: pkg.id,
        action: 'expired',
        package_type: pkg.package_type,
        total_breakfast: pkg.total_breakfast,
        total_lunch: pkg.total_lunch,
        total_dinner: pkg.total_dinner,
        consumed_breakfast: pkg.consumed_breakfast,
        consumed_lunch: pkg.consumed_lunch,
        consumed_dinner: pkg.consumed_dinner,
        balance: pkg.balance,
      }));
      await supabase.from('package_history').insert(historyRecords);
    }

    const { searchParams } = new URL(request.url);
    const memberType = searchParams.get('member_type');
    const packageType = searchParams.get('package_type');
    const isActive = searchParams.get('is_active');
    const memberId = searchParams.get('member_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('member_packages')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (memberType && memberType !== 'all') {
      query = query.eq('member_type', memberType);
    }

    if (packageType && packageType !== 'all') {
      query = query.eq('package_type', packageType);
    }

    if (isActive !== null && isActive !== 'all') {
      query = query.eq('is_active', isActive === 'true');
    }

    if (memberId) {
      query = query.eq('member_id', memberId);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get disabled days for partial_full_time packages
    const partialFullTimePackages = data.filter(p => p.package_type === 'partial_full_time');
    if (partialFullTimePackages.length > 0) {
      const packageIds = partialFullTimePackages.map(p => p.id);
      const { data: disabledDays, error: disabledError } = await supabase
        .from('package_disabled_days')
        .select('*')
        .in('package_id', packageIds);

      if (!disabledError && disabledDays) {
        // Group disabled days by package_id
        const disabledByPackage = {};
        disabledDays.forEach(d => {
          if (!disabledByPackage[d.package_id]) {
            disabledByPackage[d.package_id] = [];
          }
          disabledByPackage[d.package_id].push(d.disabled_date);
        });

        // Attach to packages
        data.forEach(pkg => {
          if (pkg.package_type === 'partial_full_time') {
            pkg.disabled_days = disabledByPackage[pkg.id] || [];
          }
        });
      }
    }

    return NextResponse.json({ packages: data }, { status: 200 });
  } catch (error) {
    console.error('Error fetching member packages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create new member package
export async function POST(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const body = await request.json();

    // Validate required fields
    if (!body.member_id) {
      return NextResponse.json({ error: 'Member is required' }, { status: 400 });
    }
    if (!body.member_type) {
      return NextResponse.json({ error: 'Member type is required' }, { status: 400 });
    }
    if (!body.package_type) {
      return NextResponse.json({ error: 'Package type is required' }, { status: 400 });
    }

    // Validate package_type specific requirements
    if (['full_time', 'partial_full_time'].includes(body.package_type)) {
      if (!body.start_date) {
        return NextResponse.json({ error: 'Start date is required for this package type' }, { status: 400 });
      }
      if (!body.end_date) {
        return NextResponse.json({ error: 'End date is required for this package type' }, { status: 400 });
      }
    }

    if (body.package_type === 'daily_basis') {
      if (!body.balance || body.balance <= 0) {
        return NextResponse.json({ error: 'Initial deposit amount is required for daily basis packages' }, { status: 400 });
      }
    }

    // Auto-expire any packages whose end_date has passed for this member
    const today = new Date().toISOString().split('T')[0];
    const { data: memberExpiredPkgs } = await supabase
      .from('member_packages')
      .select('*')
      .eq('organization_id', orgId)
      .eq('member_id', body.member_id)
      .eq('member_type', body.member_type)
      .eq('is_active', true)
      .eq('status', 'active')
      .in('package_type', ['full_time', 'partial_full_time'])
      .lt('end_date', today);

    if (memberExpiredPkgs && memberExpiredPkgs.length > 0) {
      const expIds = memberExpiredPkgs.map(p => p.id);
      await supabase
        .from('member_packages')
        .update({ status: 'expired', is_active: false })
        .in('id', expIds);

      const historyRecords = memberExpiredPkgs.map(pkg => ({
        organization_id: orgId,
        member_id: pkg.member_id,
        member_type: pkg.member_type,
        package_id: pkg.id,
        action: 'expired',
        package_type: pkg.package_type,
        total_breakfast: pkg.total_breakfast,
        total_lunch: pkg.total_lunch,
        total_dinner: pkg.total_dinner,
        consumed_breakfast: pkg.consumed_breakfast,
        consumed_lunch: pkg.consumed_lunch,
        consumed_dinner: pkg.consumed_dinner,
        balance: pkg.balance,
      }));
      await supabase.from('package_history').insert(historyRecords);
    }

    // RULE 1: Check if member already has ANY active or deactivated package (strict one-package-per-member)
    const { data: existingPackage } = await supabase
      .from('member_packages')
      .select('id, package_type, status, start_date, end_date')
      .eq('organization_id', orgId)
      .eq('member_id', body.member_id)
      .eq('member_type', body.member_type)
      .in('status', ['active', 'deactivated'])
      .maybeSingle();

    if (existingPackage) {
      const statusText = existingPackage.status === 'deactivated' ? 'deactivated' : 'active';
      return NextResponse.json(
        { error: `This member already has a ${statusText} ${existingPackage.package_type} package. Please ${existingPackage.status === 'deactivated' ? 'delete it or reactivate it' : 'wait for it to expire or deactivate it'} before creating a new package.` },
        { status: 400 }
      );
    }

    // RULE 2: Date overlap prevention - for full_time and partial_full_time packages only
    if (['full_time', 'partial_full_time'].includes(body.package_type)) {
      if (!body.start_date || !body.end_date) {
        return NextResponse.json(
          { error: 'Start date and end date are required for this package type' },
          { status: 400 }
        );
      }

      // Check for date overlap with ANY existing full_time/partial_full_time package (even expired)
      const { data: existingPackages } = await supabase
        .from('member_packages')
        .select('id, package_type, status, start_date, end_date')
        .eq('organization_id', orgId)
        .eq('member_id', body.member_id)
        .eq('member_type', body.member_type)
        .in('package_type', ['full_time', 'partial_full_time'])
        .not('start_date', 'is', null)
        .not('end_date', 'is', null);

      if (existingPackages && existingPackages.length > 0) {
        // Check each existing package for date overlap
        for (const pkg of existingPackages) {
          const newStart = body.start_date;
          const newEnd = body.end_date;
          const existingStart = pkg.start_date;
          const existingEnd = pkg.end_date;

          // Check if ranges overlap: new_start <= existing_end AND new_end >= existing_start
          if (newStart <= existingEnd && newEnd >= existingStart) {
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

    // Extract disabled_days and disabled_meals from body (for partial_full_time)
    const { disabled_days, disabled_meals, ...packageData } = body;

    // Prepare package data including disabled_meals as JSONB
    const insertData = {
      ...packageData,
      organization_id: orgId,
      status: 'active',
      is_active: true,
    };

    // Include disabled_meals if provided (stored as JSONB)
    if (disabled_meals && Object.keys(disabled_meals).length > 0) {
      insertData.disabled_meals = disabled_meals;
    }

    // Create the package
    const { data: newPackage, error: insertError } = await supabase
      .from('member_packages')
      .insert([insertData])
      .select()
      .maybeSingle();

    if (insertError) throw insertError;

    // If partial_full_time, insert disabled days
    if (body.package_type === 'partial_full_time' && disabled_days && disabled_days.length > 0) {
      const disabledDaysData = disabled_days.map(date => ({
        package_id: newPackage.id,
        disabled_date: date,
        organization_id: orgId,
      }));

      const { error: disabledError } = await supabase
        .from('package_disabled_days')
        .insert(disabledDaysData);

      if (disabledError) {
        console.error('Error inserting disabled days:', disabledError);
      } else {
        newPackage.disabled_days = disabled_days;
      }
    }

    // Create history record
    await supabase.from('package_history').insert([{
      organization_id: orgId,
      member_id: newPackage.member_id,
      member_type: newPackage.member_type,
      package_id: newPackage.id,
      action: 'created',
      package_type: newPackage.package_type,
      total_breakfast: newPackage.total_breakfast,
      total_lunch: newPackage.total_lunch,
      total_dinner: newPackage.total_dinner,
      consumed_breakfast: 0,
      consumed_lunch: 0,
      consumed_dinner: 0,
      balance: newPackage.balance,
    }]);

    // If daily_basis, create initial deposit transaction
    if (body.package_type === 'daily_basis' && body.balance > 0) {
      await supabase.from('daily_basis_transactions').insert([{
        organization_id: orgId,
        package_id: newPackage.id,
        member_id: newPackage.member_id,
        transaction_type: 'deposit',
        amount: body.balance,
        balance_before: 0,
        balance_after: body.balance,
        description: 'Initial deposit',
      }]);
    }

    return NextResponse.json({ package: newPackage }, { status: 201 });
  } catch (error) {
    console.error('Error creating member package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
