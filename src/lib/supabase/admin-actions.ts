'use server';

import { getServiceRoleClient } from './server';
import { getCurrentAdminUser } from './admin-auth';

interface AdminUser {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

type AdminStoreMode = 'admin_users' | 'profiles';
type SystemStatus = 'ready' | 'attention';

interface AdminSettingsOverview {
  adminStoreMode: AdminStoreMode;
  adminStoreLabel: string;
  adminStoreNote: string;
  adminsCount: number;
  systems: {
    id: string;
    label: string;
    status: SystemStatus;
    detail: string;
  }[];
}

function isMissingAdminUsersTable(error: { message?: string; code?: string } | null) {
  const message = error?.message ?? '';

  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    message.includes("Could not find the table 'public.admin_users'") ||
    message.includes('public.admin_users') ||
    message.includes('schema cache') ||
    message.includes('relation "admin_users" does not exist')
  );
}

async function getAdminStoreMode(
  supabase: ReturnType<typeof getServiceRoleClient>
): Promise<AdminStoreMode> {
  const { error } = await supabase
    .from('admin_users')
    .select('user_id', { count: 'exact', head: true });

  if (!error) {
    return 'admin_users';
  }

  return isMissingAdminUsersTable(error) ? 'profiles' : 'admin_users';
}

async function countExistingAdmins(
  supabase: ReturnType<typeof getServiceRoleClient>,
  mode: AdminStoreMode
) {
  if (mode === 'admin_users') {
    const { count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact', head: true });

    return count ?? 0;
  }

  const { count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin');

  return count ?? 0;
}

async function grantAdminAccess(
  supabase: ReturnType<typeof getServiceRoleClient>,
  mode: AdminStoreMode,
  userId: string,
  email: string,
  createdBy?: string
) {
  if (mode === 'admin_users') {
    return supabase
      .from('admin_users')
      .insert({
        user_id: userId,
        email,
        role: 'admin',
        created_by: createdBy,
      });
  }

  return supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        display_name: email.split('@')[0],
        role: 'admin',
      },
      { onConflict: 'id' }
    );
}

async function requireCurrentAdmin(): Promise<{ userId?: string; error?: string }> {
  const { user, isAdmin } = await getCurrentAdminUser();

  if (!user || !isAdmin) {
    return { error: 'Unauthorized' };
  }

  return { userId: user.id };
}

/**
 * Create additional admin user (requires authentication)
 */
export async function createAdminUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    const currentAdmin = await requireCurrentAdmin();
    if (!currentAdmin.userId) {
      return { success: false, error: currentAdmin.error };
    }

    const supabase = getServiceRoleClient();
    const mode = await getAdminStoreMode(supabase);

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

    // Add to the configured admin store
    const { error: adminError } = await grantAdminAccess(
      supabase,
      mode,
      userId,
      email,
      currentAdmin.userId
    );

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
export async function getAdmins(): Promise<{ success: boolean; admins?: AdminUser[]; error?: string }> {
  try {
    const currentAdmin = await requireCurrentAdmin();
    if (!currentAdmin.userId) {
      return { success: false, error: currentAdmin.error };
    }

    const supabase = getServiceRoleClient();
    const mode = await getAdminStoreMode(supabase);

    if (mode === 'profiles') {
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('id, email, role, created_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        admins: admins.map((admin) => ({
          user_id: admin.id,
          email: admin.email,
          role: admin.role,
          created_at: admin.created_at,
        })),
      };
    }

    const { data: admins, error } = await supabase
      .from('admin_users')
      .select('user_id, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingAdminUsersTable(error)) {
        const { data: profileAdmins, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, role, created_at')
          .eq('role', 'admin')
          .order('created_at', { ascending: false });

        if (profileError) {
          return { success: false, error: profileError.message };
        }

        return {
          success: true,
          admins: profileAdmins.map((admin) => ({
            user_id: admin.id,
            email: admin.email,
            role: admin.role,
            created_at: admin.created_at,
          })),
        };
      }

      return { success: false, error: error.message };
    }

    return { success: true, admins };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}

export async function getAdminSettingsOverview(): Promise<{
  success: boolean;
  data?: AdminSettingsOverview;
  error?: string;
}> {
  try {
    const currentAdmin = await requireCurrentAdmin();
    if (!currentAdmin.userId) {
      return { success: false, error: currentAdmin.error };
    }

    const supabase = getServiceRoleClient();
    const mode = await getAdminStoreMode(supabase);
    const adminsCount = await countExistingAdmins(supabase, mode);
    const hasSupabaseEnv = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const hasStripeEnv = Boolean(
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
        process.env.STRIPE_SECRET_KEY
    );
    const stripeMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test')
      ? 'test mode'
      : 'configured';
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const hasWebhookSecret = Boolean(
      webhookSecret && webhookSecret !== 'whsec_...'
    );
    const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

    let storageReady = false;
    let storageDetail = 'Card photo bucket has not been checked';

    if (hasSupabaseEnv) {
      const { error } = await supabase.storage.getBucket('card-photos');
      storageReady = !error;
      storageDetail = error
        ? `card-photos bucket needs attention: ${error.message}`
        : 'card-photos bucket is available';
    } else {
      storageDetail = 'Supabase env vars are missing';
    }

    return {
      success: true,
      data: {
        adminStoreMode: mode,
        adminStoreLabel:
          mode === 'admin_users' ? 'Dedicated admin table' : 'Profile roles',
        adminStoreNote:
          mode === 'admin_users'
            ? 'Admin membership is stored in public.admin_users.'
            : 'public.admin_users is not installed, so admin access is stored in profiles.role. This is valid for the current setup.',
        adminsCount,
        systems: [
          {
            id: 'supabase',
            label: 'Supabase',
            status: hasSupabaseEnv ? 'ready' : 'attention',
            detail: hasSupabaseEnv
              ? 'Database, auth, and service role env vars are configured'
              : 'Missing one or more Supabase env vars',
          },
          {
            id: 'storage',
            label: 'Photo Storage',
            status: storageReady ? 'ready' : 'attention',
            detail: storageDetail,
          },
          {
            id: 'stripe',
            label: 'Stripe Checkout',
            status: hasStripeEnv ? 'ready' : 'attention',
            detail: hasStripeEnv
              ? `Checkout keys are configured in ${stripeMode}`
              : 'Missing Stripe publishable or secret key',
          },
          {
            id: 'webhook',
            label: 'Stripe Webhook',
            status: hasWebhookSecret ? 'ready' : 'attention',
            detail: hasWebhookSecret
              ? 'Webhook signature secret is configured'
              : 'Webhook secret is missing or still a placeholder; browser success pages can still finalize local test orders',
          },
          {
            id: 'anthropic',
            label: 'AI Photo Read',
            status: hasAnthropic ? 'ready' : 'attention',
            detail: hasAnthropic
              ? 'Anthropic vision key is configured'
              : 'Anthropic key is missing; Suggest Info will be unavailable',
          },
        ],
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
