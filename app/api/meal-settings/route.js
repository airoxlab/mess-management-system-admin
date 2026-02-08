import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET meal settings for organization
export async function GET(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { data: settings, error } = await supabase
      .from('meal_settings')
      .select('*')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error) throw error;

    // If no settings exist, create default settings
    if (!settings) {
      const { data: newSettings, error: createError } = await supabase
        .from('meal_settings')
        .insert([{
          organization_id: orgId,
          breakfast_enabled: false,
          lunch_enabled: false,
          dinner_enabled: false,
        }])
        .select()
        .single();

      if (createError) throw createError;

      return NextResponse.json({ settings: newSettings }, { status: 200 });
    }

    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    console.error('Error fetching meal settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update meal settings
export async function PUT(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const body = await request.json();
    const { breakfast_enabled, lunch_enabled, dinner_enabled } = body;

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from('meal_settings')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle();

    let updatedSettings;

    if (existingSettings) {
      // Update existing settings
      const { data, error: updateError } = await supabase
        .from('meal_settings')
        .update({
          breakfast_enabled: breakfast_enabled ?? false,
          lunch_enabled: lunch_enabled ?? false,
          dinner_enabled: dinner_enabled ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', orgId)
        .select()
        .single();

      if (updateError) throw updateError;
      updatedSettings = data;
    } else {
      // Create new settings
      const { data, error: createError } = await supabase
        .from('meal_settings')
        .insert([{
          organization_id: orgId,
          breakfast_enabled: breakfast_enabled ?? false,
          lunch_enabled: lunch_enabled ?? false,
          dinner_enabled: dinner_enabled ?? false,
        }])
        .select()
        .single();

      if (createError) throw createError;
      updatedSettings = data;
    }

    return NextResponse.json({
      message: 'Meal settings updated successfully',
      settings: updatedSettings,
    }, { status: 200 });
  } catch (error) {
    console.error('Error updating meal settings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
