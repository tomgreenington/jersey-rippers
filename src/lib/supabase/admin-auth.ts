'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { getServiceRoleClient } from './server';

function isMissingAdminUsersTable(error: { message?: string; code?: string } | null) {
  return (
    error?.code === 'PGRST205' ||
    error?.message?.includes("Could not find the table 'public.admin_users'")
  );
}

async function createCookieClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot always persist refreshed cookies.
          }
        },
      },
    }
  );
}

async function getAdminRole(userId: string): Promise<string | null> {
  try {
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && !isMissingAdminUsersTable(error)) {
      return null;
    }

    if (data?.role) {
      return data.role;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      return null;
    }

    return profile?.role ?? null;
  } catch {
    return null;
  }
}

/**
 * Check if a user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const role = await getAdminRole(userId);
  return role === 'admin';
}

/**
 * Check the currently authenticated cookie session for admin access.
 */
export async function getCurrentAdminUser(): Promise<{
  user: User | null;
  isAdmin: boolean;
  role: string | null;
  error?: string;
}> {
  try {
    const supabase = await createCookieClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return {
        user: null,
        isAdmin: false,
        role: null,
        error: error?.message || 'Not authenticated',
      };
    }

    const role = await getAdminRole(data.user.id);

    return {
      user: data.user,
      isAdmin: role === 'admin',
      role,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { user: null, isAdmin: false, role: null, error: message };
  }
}
