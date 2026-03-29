import { getServiceRoleClient } from './server';

/**
 * Check if a user is an admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', userId)
      .single();

    return !error && data?.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Check if any admins exist (for setup flow)
 */
export async function adminsExist(): Promise<boolean> {
  try {
    const supabase = getServiceRoleClient();

    const { count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true });

    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}
