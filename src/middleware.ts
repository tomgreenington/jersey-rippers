/**
 * Supabase Auth Middleware
 * Refreshes session on every request and handles cookie management
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Match all routes except:
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
