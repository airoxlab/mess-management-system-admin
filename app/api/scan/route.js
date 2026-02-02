import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// POST - Scan member QR code
export async function POST(request) {
  try {
    const body = await request.json();
    const { qrData } = body;

    if (!qrData) {
      return NextResponse.json(
        { error: 'QR data is required' },
        { status: 400 }
      );
    }

    // QR data could be member_id or UUID
    let query = supabase.from('members').select('*');

    // Check if it's a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(qrData)) {
      query = query.eq('id', qrData);
    } else {
      // Assume it's a member_id
      query = query.eq('member_id', qrData);
    }

    const { data: member, error } = await query.single();

    if (error || !member) {
      return NextResponse.json(
        { error: 'Member not found. Please check the QR code.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error('Error scanning member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scan member' },
      { status: 500 }
    );
  }
}
