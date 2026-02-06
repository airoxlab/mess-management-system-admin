import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// GET - List all packages
export async function GET(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('packages')
      .select('*')
      .eq('organization_id', orgId)
      .order('price', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: packages, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

// POST - Create new package
export async function POST(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const body = await request.json();
    const { name, meals_count, price, is_active } = body;

    if (!name || !meals_count || price === undefined) {
      return NextResponse.json(
        { error: 'Name, meals count, and price are required' },
        { status: 400 }
      );
    }

    const { data: pkg, error } = await supabase
      .from('packages')
      .insert([
        {
          organization_id: orgId,
          name,
          meals_count: parseInt(meals_count),
          price: parseFloat(price),
          is_active: is_active !== false,
        },
      ])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ package: pkg }, { status: 201 });
  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create package' },
      { status: 500 }
    );
  }
}
