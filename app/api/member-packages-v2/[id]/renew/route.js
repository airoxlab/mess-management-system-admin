import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// POST renew a package
export async function POST(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { id } = params;
    const body = await request.json();

    // Get the existing package
    const { data: existingPackage, error: fetchError } = await supabase
      .from('member_packages')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError) throw fetchError;

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Calculate remaining meals from existing package
    const remainingBreakfast = Math.max(0, existingPackage.total_breakfast - existingPackage.consumed_breakfast);
    const remainingLunch = Math.max(0, existingPackage.total_lunch - existingPackage.consumed_lunch);
    const remainingDinner = Math.max(0, existingPackage.total_dinner - existingPackage.consumed_dinner);

    // Determine carry-over amounts
    const carryOver = body.carry_over === true;
    const carryOverBreakfast = carryOver ? remainingBreakfast : 0;
    const carryOverLunch = carryOver ? remainingLunch : 0;
    const carryOverDinner = carryOver ? remainingDinner : 0;

    // Create snapshot for history before updating
    await supabase.from('package_history').insert([{
      member_id: existingPackage.member_id,
      member_type: existingPackage.member_type,
      package_id: existingPackage.id,
      action: 'renewed',
      package_type: existingPackage.package_type,
      total_breakfast: existingPackage.total_breakfast,
      total_lunch: existingPackage.total_lunch,
      total_dinner: existingPackage.total_dinner,
      consumed_breakfast: existingPackage.consumed_breakfast,
      consumed_lunch: existingPackage.consumed_lunch,
      consumed_dinner: existingPackage.consumed_dinner,
      balance: existingPackage.balance,
      organization_id: orgId,
    }]);

    // Mark old package as renewed
    await supabase
      .from('member_packages')
      .update({
        status: 'renewed',
        is_active: false,
      })
      .eq('id', id);

    // Extract disabled_days from body
    const { carry_over, disabled_days, ...newPackageData } = body;

    // Build new package data
    const newPackage = {
      member_id: existingPackage.member_id,
      member_type: existingPackage.member_type,
      package_type: newPackageData.package_type || existingPackage.package_type,
      start_date: newPackageData.start_date || null,
      end_date: newPackageData.end_date || null,
      breakfast_enabled: newPackageData.breakfast_enabled ?? existingPackage.breakfast_enabled,
      lunch_enabled: newPackageData.lunch_enabled ?? existingPackage.lunch_enabled,
      dinner_enabled: newPackageData.dinner_enabled ?? existingPackage.dinner_enabled,
      total_breakfast: (newPackageData.total_breakfast || 0) + carryOverBreakfast,
      total_lunch: (newPackageData.total_lunch || 0) + carryOverLunch,
      total_dinner: (newPackageData.total_dinner || 0) + carryOverDinner,
      consumed_breakfast: 0,
      consumed_lunch: 0,
      consumed_dinner: 0,
      balance: newPackageData.balance || 0,
      breakfast_price: newPackageData.breakfast_price || existingPackage.breakfast_price,
      lunch_price: newPackageData.lunch_price || existingPackage.lunch_price,
      dinner_price: newPackageData.dinner_price || existingPackage.dinner_price,
      price: newPackageData.price || 0,
      carried_over_from_package_id: id,
      carried_over_breakfast: carryOverBreakfast,
      carried_over_lunch: carryOverLunch,
      carried_over_dinner: carryOverDinner,
      status: 'active',
      is_active: true,
      organization_id: orgId,
    };

    // Create new package
    const { data: createdPackage, error: insertError } = await supabase
      .from('member_packages')
      .insert([newPackage])
      .select()
      .single();

    if (insertError) throw insertError;

    // If partial_full_time, insert disabled days
    if (newPackage.package_type === 'partial_full_time' && disabled_days && disabled_days.length > 0) {
      const disabledDaysData = disabled_days.map(date => ({
        package_id: createdPackage.id,
        disabled_date: date,
        organization_id: orgId,
      }));

      await supabase
        .from('package_disabled_days')
        .insert(disabledDaysData);

      createdPackage.disabled_days = disabled_days;
    }

    // Create history record for new package
    await supabase.from('package_history').insert([{
      member_id: createdPackage.member_id,
      member_type: createdPackage.member_type,
      package_id: createdPackage.id,
      previous_package_id: id,
      action: 'created',
      package_type: createdPackage.package_type,
      total_breakfast: createdPackage.total_breakfast,
      total_lunch: createdPackage.total_lunch,
      total_dinner: createdPackage.total_dinner,
      consumed_breakfast: 0,
      consumed_lunch: 0,
      consumed_dinner: 0,
      balance: createdPackage.balance,
      organization_id: orgId,
    }]);

    // If daily_basis and has initial deposit, create transaction
    if (newPackage.package_type === 'daily_basis' && newPackage.balance > 0) {
      await supabase.from('daily_basis_transactions').insert([{
        package_id: createdPackage.id,
        member_id: createdPackage.member_id,
        transaction_type: 'deposit',
        amount: newPackage.balance,
        balance_before: 0,
        balance_after: newPackage.balance,
        description: 'Initial deposit (renewal)',
        organization_id: orgId,
      }]);
    }

    return NextResponse.json({
      message: 'Package renewed successfully',
      package: createdPackage,
      previous_package_id: id,
      carry_over_summary: {
        enabled: carryOver,
        breakfast: carryOverBreakfast,
        lunch: carryOverLunch,
        dinner: carryOverDinner,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error renewing package:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
