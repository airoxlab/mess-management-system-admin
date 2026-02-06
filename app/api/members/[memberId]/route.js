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

// GET - Get single member
export async function GET(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { memberId } = params;

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .single();

    if (error) {
      throw error;
    }

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error fetching member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch member' },
      { status: 500 }
    );
  }
}

// PUT - Update member
export async function PUT(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { memberId } = params;
    const body = await request.json();
    const { name, contact, valid_until, balance_meals, status, member_type, photo_url } = body;

    // Validate name if provided
    if (name !== undefined) {
      const nameError = validateName(name);
      if (nameError) {
        return NextResponse.json(
          { error: nameError },
          { status: 400 }
        );
      }
    }

    // Validate contact if provided
    if (contact !== undefined && contact !== null && contact !== '') {
      const contactError = validateContact(contact);
      if (contactError) {
        return NextResponse.json(
          { error: contactError },
          { status: 400 }
        );
      }
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updates.name = name.trim();
    if (contact !== undefined) updates.contact = contact || null;
    if (valid_until !== undefined) updates.valid_until = valid_until;
    if (balance_meals !== undefined) updates.balance_meals = parseInt(balance_meals);
    if (status !== undefined) updates.status = status;
    if (member_type !== undefined && VALID_MEMBER_TYPES.includes(member_type)) {
      updates.member_type = member_type;
    }
    if (photo_url !== undefined) updates.photo_url = photo_url || null;

    const { data: member, error } = await supabase
      .from('members')
      .update(updates)
      .eq('id', memberId)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member' },
      { status: 500 }
    );
  }
}

// DELETE - Delete member
export async function DELETE(request, { params }) {
  try {
    const { orgId, error: orgError } = requireOrgId(request);
    if (orgError) return orgError;

    const { memberId } = params;

    const { error } = await supabase
      .from('members')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', orgId);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete member' },
      { status: 500 }
    );
  }
}
