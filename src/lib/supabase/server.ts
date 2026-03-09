/**
 * Supabase Server Client
 * Server-side only. Uses service role key for admin operations.
 * NEVER expose to client.
 */

import { createClient } from '@supabase/supabase-js';

export const getServiceRoleClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
