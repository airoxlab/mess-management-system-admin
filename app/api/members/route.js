import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import { requireOrgId } from '@/lib/get-org-id';

// Validation helpers
const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s.\-']+$/;
  if (!name || !name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (!nameRegex.test(name.trim())) return 'Name can only contain letters, spaces, and basic punctuation';
  return null;
};

const validateContact = (contact) => {
  if (!contact) return null; // Optional field
  const contactRegex = /^[\d\s\-()+ ]+$/;
  const digitsOnly = contact.replace(/\D/g, '');
  if (!contactRegex.test(contact)) return 'Contact can only contain numbers, dashes, and spaces';
  if (digitsOnly.length < 7) return 'Contact must have at least 7 digits';
  if (digitsOnly.length > 15) return 'Contact must not exceed 15 digits';
  return null;
};

const VALID_MEMBER_TYPES = ['student', 'staff', 'faculty', 'guest'];

// GET - List all members
export async function GET(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('members')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,member_id.ilike.%${search}%`);
    }

    const { data: members, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST - Create new member
export async function POST(request) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const body = await request.json();
    const { member_id: providedMemberId, name, contact, valid_until, balance_meals, status, member_type, photo_url } = body;

    const member_id = providedMemberId?.trim();

    // Validate required fields
    if (!member_id) {
      return NextResponse.json(
        { error: 'Member ID is required' },
        { status: 400 }
      );
    }

    // Validate name
    const nameError = validateName(name);
    if (nameError) {
      return NextResponse.json(
        { error: nameError },
        { status: 400 }
      );
    }

    // Validate contact if provided
    const contactError = validateContact(contact);
    if (contactError) {
      return NextResponse.json(
        { error: contactError },
        { status: 400 }
      );
    }

    if (!valid_until) {
      return NextResponse.json(
        { error: 'Valid Until date is required' },
        { status: 400 }
      );
    }

    // Validate member_type if provided
    const finalMemberType = member_type && VALID_MEMBER_TYPES.includes(member_type) ? member_type : 'student';

    const { data: member, error } = await supabase
      .from('members')
      .insert([
        {
          organization_id: orgId,
          member_id,
          name: name.trim(),
          contact: contact || null,
          valid_until,
          balance_meals: parseInt(balance_meals) || 0,
          status: status || 'active',
          member_type: finalMemberType,
          photo_url: photo_url || null,
        },
      ])
      .select()
      .single();

    if (error) {
      // Handle duplicate member_id error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A member with this ID already exists' },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error('Error creating member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create member' },
      { status: 500 }
    );
  }
}
