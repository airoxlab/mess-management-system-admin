import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId, getOrgId } from '@/lib/get-org-id';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
export async function GET(request) {
  try {
    const orgId = getOrgId(request);

    let organization, error;

    if (orgId) {
      // Fetch specific organization by ID
      ({ data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single());
    } else {
      // Fallback: fetch first organization (single-tenant)
      ({ data: organization, error } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single());
    }

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
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    return NextResponse.json(
      { organization },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
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
    console.log('=== PUT /api/organization STARTED ===');

    const { orgId, error: orgError } = requireOrgId(request);
    console.log('orgId from requireOrgId:', orgId);
    console.log('orgError:', orgError);
    if (orgError) return orgError;

    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    console.log('Fetching existing organization...');
    // First, get the existing organization (including settings for merging)
    const { data: existing, error: fetchError } = await supabase
      .from('organizations')
      .select('id, settings')
      .eq('id', orgId)
      .single();

    console.log('Existing org data:', existing);
    console.log('Fetch error:', fetchError);

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
    if ('meal_skip_deadline' in body) updateData.meal_skip_deadline = parseInt(body.meal_skip_deadline) || 30;

    // Merge settings with existing settings (don't replace entirely)
    if ('settings' in body) {
      const existingSettings = existing?.settings || {};
      updateData.settings = { ...existingSettings, ...(body.settings || {}) };
      console.log('Merged settings:', JSON.stringify(updateData.settings, null, 2));
    }

    console.log('Final updateData:', JSON.stringify(updateData, null, 2));

    let organization;

    if (existing) {
      console.log('Updating existing organization with ID:', orgId);
      // Update existing organization
      const { data, error } = await supabase
        .from('organizations')
        .update(updateData)
        .eq('id', orgId)
        .select()
        .single();

      console.log('Update result - data:', data);
      console.log('Update result - error:', error);

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

    console.log('=== PUT /api/organization SUCCESS ===');
    console.log('Returning organization:', organization);

    return NextResponse.json(
      { organization },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('=== PUT /api/organization ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: error.message || 'Failed to update organization' },
      { status: 500 }
    );
  }
}
