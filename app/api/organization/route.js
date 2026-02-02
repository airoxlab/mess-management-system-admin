import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// Default organization data
const DEFAULT_ORG = {
  name: 'LIMHS CAFETERIA',
  slug: 'limhs-cafeteria',
  logo_url: null,
  address: '',
  contact_phone: '',
  contact_email: '',
  support_phone: '',
  support_whatsapp: '',
  lost_card_fee: 500,
  is_active: true,
};

// GET - Get organization settings (fetches first org or creates default)
export async function GET() {
  try {
    // Fetch the first organization (single-tenant)
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    // If no organization found, create default one
    if (!organization) {
      const { data: newOrg, error: insertError } = await supabase
        .from('organizations')
        .insert([DEFAULT_ORG])
        .select()
        .single();

      if (insertError) throw insertError;

      return NextResponse.json(
        { organization: newOrg },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    return NextResponse.json(
      { organization },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

// PUT - Update organization settings
export async function PUT(request) {
  try {
    const body = await request.json();

    // First, get the existing organization
    const { data: existing, error: fetchError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Build update object only with provided fields
    const updateData = {};
    if ('name' in body) updateData.name = body.name?.trim() || 'LIMHS CAFETERIA';
    if ('logo_url' in body) updateData.logo_url = body.logo_url || null;
    if ('address' in body) updateData.address = body.address?.trim() || null;
    if ('contact_phone' in body) updateData.contact_phone = body.contact_phone?.trim() || null;
    if ('contact_email' in body) updateData.contact_email = body.contact_email?.trim() || null;
    if ('support_phone' in body) updateData.support_phone = body.support_phone?.trim() || null;
    if ('support_whatsapp' in body) updateData.support_whatsapp = body.support_whatsapp?.trim() || null;
    if ('lost_card_fee' in body) updateData.lost_card_fee = parseFloat(body.lost_card_fee) || 500;

    let organization;

    if (existing) {
      // Update existing organization
      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      organization = data;
    } else {
      // Create new organization with provided data
      const insertData = {
        ...DEFAULT_ORG,
        ...updateData,
      };

      const { data, error } = await supabase
        .from('organizations')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;
      organization = data;
    }

    return NextResponse.json(
      { organization },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update organization' },
      { status: 500 }
    );
  }
}
