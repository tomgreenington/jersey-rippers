import { isUserAdmin } from '@/lib/supabase/admin-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ isAdmin: false });
    }

    const isAdmin = await isUserAdmin(userId);
    return NextResponse.json({ isAdmin });
  } catch (error) {
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
