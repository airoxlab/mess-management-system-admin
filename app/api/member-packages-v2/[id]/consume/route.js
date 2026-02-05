import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// POST consume a meal from package
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { meal_type, notes } = body;

    if (!meal_type || !['breakfast', 'lunch', 'dinner'].includes(meal_type)) {
      return NextResponse.json({ error: 'Valid meal type is required (breakfast, lunch, dinner)' }, { status: 400 });
    }

    // Get the package
    const { data: pkg, error: fetchError } = await supabase
      .from('member_packages')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Check if package is active
    if (!pkg.is_active || pkg.status !== 'active') {
      return NextResponse.json({ error: 'This package is not active' }, { status: 400 });
    }

    // Check if meal type is enabled for this package
    const mealEnabledKey = `${meal_type}_enabled`;
    if (!pkg[mealEnabledKey]) {
      return NextResponse.json({ error: `${meal_type} is not enabled for this package` }, { status: 400 });
    }

    // For full_time and partial_full_time, check date range
    if (['full_time', 'partial_full_time'].includes(pkg.package_type)) {
      const today = new Date().toISOString().split('T')[0];
      if (today < pkg.start_date || today > pkg.end_date) {
        return NextResponse.json({ error: 'Package date range has expired' }, { status: 400 });
      }

      // For partial_full_time, check if today is a disabled day
      if (pkg.package_type === 'partial_full_time') {
        const { data: disabledDays } = await supabase
          .from('package_disabled_days')
          .select('disabled_date')
          .eq('package_id', id)
          .eq('disabled_date', today);

        if (disabledDays && disabledDays.length > 0) {
          return NextResponse.json({ error: 'Today is a disabled day for this package' }, { status: 400 });
        }
      }
    }

    // Handle based on package type
    let updateData = {};
    let consumptionRecord = {
      package_id: id,
      member_id: pkg.member_id,
      member_type: pkg.member_type,
      meal_type,
      notes,
    };

    if (pkg.package_type === 'daily_basis') {
      // Deduct from balance based on meal price
      const priceKey = `${meal_type}_price`;
      const mealPrice = pkg[priceKey] || 0;

      if (pkg.balance < mealPrice) {
        return NextResponse.json({
          error: `Insufficient balance. Current: Rs. ${pkg.balance}, Required: Rs. ${mealPrice}`,
        }, { status: 400 });
      }

      const newBalance = pkg.balance - mealPrice;
      updateData = { balance: newBalance };

      consumptionRecord.amount_deducted = mealPrice;
      consumptionRecord.balance_after = newBalance;

      // Create transaction record
      await supabase.from('daily_basis_transactions').insert([{
        package_id: id,
        member_id: pkg.member_id,
        transaction_type: 'meal_deduction',
        amount: mealPrice,
        balance_before: pkg.balance,
        balance_after: newBalance,
        meal_type,
        description: `${meal_type.charAt(0).toUpperCase() + meal_type.slice(1)} consumption`,
      }]);
    } else {
      // For fixed meal packages (full_time, partial_full_time, partial)
      const totalKey = `total_${meal_type}`;
      const consumedKey = `consumed_${meal_type}`;

      if (pkg[consumedKey] >= pkg[totalKey]) {
        return NextResponse.json({
          error: `No ${meal_type} meals remaining. Used: ${pkg[consumedKey]}/${pkg[totalKey]}`,
        }, { status: 400 });
      }

      updateData[consumedKey] = pkg[consumedKey] + 1;
    }

    // Update the package
    const { error: updateError } = await supabase
      .from('member_packages')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // Create consumption history record
    await supabase.from('meal_consumption_history').insert([consumptionRecord]);

    // Get updated package
    const { data: updatedPackage } = await supabase
      .from('member_packages')
      .select('*')
      .eq('id', id)
      .single();

    return NextResponse.json({
      message: `${meal_type} consumed successfully`,
      package: updatedPackage,
    }, { status: 200 });
  } catch (error) {
    console.error('Error consuming meal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
