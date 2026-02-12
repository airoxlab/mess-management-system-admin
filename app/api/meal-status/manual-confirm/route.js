import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { orgId, error } = requireOrgId(request);
  if (error) return error;

  try {
    const body = await request.json();
    const { member_id, member_type, date, meal_type, menu_option_id } = body;

    if (!member_id || !member_type || !date || !meal_type) {
      return NextResponse.json(
        { error: 'Member ID, member type, date, and meal type are required' },
        { status: 400 }
      );
    }

    // Get member's active package
    const { data: memberPackage, error: packageError } = await supabase
      .from('member_packages')
      .select('*')
      .eq('organization_id', orgId)
      .eq('member_id', member_id)
      .eq('member_type', member_type)
      .eq('is_active', true)
      .eq('status', 'active')
      .maybeSingle();

    if (packageError) {
      console.error('Error fetching member package:', packageError);
      return NextResponse.json(
        { error: 'Failed to fetch member package' },
        { status: 500 }
      );
    }

    // If member has a daily_basis package, check balance and deduct
    if (memberPackage && memberPackage.package_type === 'daily_basis') {
      const mealEnabledKey = `${meal_type}_enabled`;
      if (!memberPackage[mealEnabledKey]) {
        return NextResponse.json(
          { error: `${meal_type} is not enabled for this member's package` },
          { status: 400 }
        );
      }

      const priceKey = `${meal_type}_price`;
      const mealPrice = memberPackage[priceKey] || 0;

      if (memberPackage.balance < mealPrice) {
        return NextResponse.json({
          error: `Insufficient balance. Current: Rs. ${memberPackage.balance.toFixed(2)}, Required: Rs. ${mealPrice.toFixed(2)}`,
        }, { status: 400 });
      }

      // Deduct balance
      const newBalance = memberPackage.balance - mealPrice;
      const { error: updateBalanceError } = await supabase
        .from('member_packages')
        .update({ balance: newBalance })
        .eq('id', memberPackage.id);

      if (updateBalanceError) {
        console.error('Error updating balance:', updateBalanceError);
        return NextResponse.json(
          { error: 'Failed to deduct balance' },
          { status: 500 }
        );
      }

      // Create transaction record
      await supabase.from('daily_basis_transactions').insert([{
        organization_id: orgId,
        package_id: memberPackage.id,
        member_id,
        transaction_type: 'meal_deduction',
        amount: mealPrice,
        balance_before: memberPackage.balance,
        balance_after: newBalance,
        meal_type,
        description: `${meal_type.charAt(0).toUpperCase() + meal_type.slice(1)} consumption`,
      }]);

      // Create consumption history record
      await supabase.from('meal_consumption_history').insert([{
        organization_id: orgId,
        package_id: memberPackage.id,
        member_id,
        member_type,
        meal_type,
        amount_deducted: mealPrice,
        balance_after: newBalance,
      }]);

      console.log(`✅ Deducted Rs. ${mealPrice} from daily basis package. New balance: Rs. ${newBalance}`);
    }

    // 1. Create/update meal selection record (mark as needed)
    const neededKey = `${meal_type}_needed`;

    // Check if a selection already exists
    const { data: existing, error: fetchError } = await supabase
      .from('meal_selections')
      .select('id, breakfast_needed, lunch_needed, dinner_needed')
      .eq('organization_id', orgId)
      .eq('member_id', member_id)
      .eq('member_type', member_type)
      .eq('date', date)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking existing selection:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing selection' },
        { status: 500 }
      );
    }

    if (existing) {
      // Update existing selection
      const { error: updateError } = await supabase
        .from('meal_selections')
        .update({ [neededKey]: true })
        .eq('id', existing.id);

      if (updateError) {
        console.error('Error updating meal selection:', updateError);
        return NextResponse.json(
          { error: 'Failed to update meal selection' },
          { status: 500 }
        );
      }
      console.log('✅ Updated meal selection for member:', member_id, 'date:', date, 'meal:', meal_type);
    } else {
      // Create new selection
      const { data: newSelection, error: insertError } = await supabase
        .from('meal_selections')
        .insert([{
          organization_id: orgId,
          member_id,
          member_type,
          date,
          breakfast_needed: meal_type === 'breakfast' ? true : false,
          lunch_needed: meal_type === 'lunch' ? true : false,
          dinner_needed: meal_type === 'dinner' ? true : false,
        }])
        .select();

      if (insertError) {
        console.error('Error creating meal selection:', insertError);
        return NextResponse.json(
          { error: 'Failed to create meal selection' },
          { status: 500 }
        );
      }
      console.log('✅ Created meal selection:', newSelection);
    }

    // 2. If menu option provided, save it
    if (menu_option_id) {
      // Check if menu selection already exists
      const { data: existingMenu, error: menuFetchError } = await supabase
        .from('member_menu_selections')
        .select('id')
        .eq('organization_id', orgId)
        .eq('member_id', member_id)
        .eq('member_type', member_type)
        .eq('date', date)
        .eq('meal_type', meal_type)
        .maybeSingle();

      if (menuFetchError && menuFetchError.code !== 'PGRST116') {
        console.error('Error checking existing menu selection:', menuFetchError);
        return NextResponse.json(
          { error: 'Failed to check existing menu selection' },
          { status: 500 }
        );
      }

      if (existingMenu) {
        // Update existing menu selection
        const { error: updateMenuError } = await supabase
          .from('member_menu_selections')
          .update({ menu_option_id })
          .eq('id', existingMenu.id);

        if (updateMenuError) {
          console.error('Error updating menu selection:', updateMenuError);
          return NextResponse.json(
            { error: 'Failed to update menu selection' },
            { status: 500 }
          );
        }
        console.log('✅ Updated menu selection for member:', member_id, 'meal:', meal_type, 'option:', menu_option_id);
      } else {
        // Create new menu selection
        const { data: newMenuSelection, error: insertMenuError } = await supabase
          .from('member_menu_selections')
          .insert([{
            organization_id: orgId,
            member_id,
            member_type,
            date,
            meal_type,
            menu_option_id,
          }])
          .select();

        if (insertMenuError) {
          console.error('Error creating menu selection:', insertMenuError);
          return NextResponse.json(
            { error: 'Failed to create menu selection' },
            { status: 500 }
          );
        }
        console.log('✅ Created menu selection:', newMenuSelection);
      }
    }

    console.log('✅ Manual meal confirmation completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Meal confirmed successfully'
    });
  } catch (err) {
    console.error('Manual confirm error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to confirm meal' },
      { status: 500 }
    );
  }
}
