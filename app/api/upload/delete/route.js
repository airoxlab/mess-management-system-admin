import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// Helper to extract path from Supabase URL
const extractPathFromUrl = (url) => {
  if (!url) return null;
  try {
    const match = url.match(/\/uploads\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

// POST - Delete file from Supabase storage
export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'No URL provided' },
        { status: 400 }
      );
    }

    const path = extractPathFromUrl(url);
    if (!path) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const { error } = await supabase.storage
      .from('uploads')
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}
