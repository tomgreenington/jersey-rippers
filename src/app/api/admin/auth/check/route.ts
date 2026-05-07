import { getCurrentAdminUser } from '@/lib/supabase/admin-auth';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const { user, isAdmin, role } = await getCurrentAdminUser();
    return NextResponse.json({
      isAdmin,
      role,
      email: user?.email ?? null,
    });
  } catch {
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
