'use server';

import { getServiceRoleClient } from './server';
import { createClient } from '@supabase/supabase-js';

/**
 * Create first admin user (setup only)
 * This should only be called once from /admin/setup
 */
export async function createFirstAdmin(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const supabase = getServiceRoleClient();

    // Check if any admins exist
    const { count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true });

    if ((count ?? 0) > 0) {
      return { success: false, error: 'First admin already exists' };
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { success: false, error: 'Failed to create user' };
    }

    // Add to admin_users table
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert({
        user_id: userId,
        email,
        role: 'admin',
      });

    if (adminError) {
      return { success: false, error: adminError.message };
    }

    return { success: true, userId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Create additional admin user (requires authentication)
 */
export async function createAdminUser(
  email: string,
  password: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const supabase = getServiceRoleClient();

    // Verify requesting user is admin
    const { data: adminCheck, error: checkError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', requestingUserId)
      .single();

    if (checkError || adminCheck?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { success: false, error: 'Failed to create user' };
    }

    // Add to admin_users table
    const { error: adminError } = await supabase
      .from('admin_users')
      .insert({
        user_id: userId,
        email,
        role: 'admin',
        created_by: requestingUserId,
      });

    if (adminError) {
      return { success: false, error: adminError.message };
    }

    return { success: true, userId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

/**
 * Get all admins
 */
export async function getAdmins(
  requestingUserId: string
): Promise<{ success: boolean; admins?: any[]; error?: string }> {
  try {
    const supabase = getServiceRoleClient();

    // Verify requesting user is admin
    const { data: adminCheck, error: checkError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', requestingUserId)
      .single();

    if (checkError || adminCheck?.role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: admins, error } = await supabase
      .from('admin_users')
      .select('user_id, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, admins };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
