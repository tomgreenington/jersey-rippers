'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createAdminUser,
  getAdminSettingsOverview,
  getAdmins,
} from '@/lib/supabase/admin-actions';
import { createClient } from '@/lib/supabase/client';

interface Admin {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

interface AdminSettingsOverview {
  adminStoreMode: 'admin_users' | 'profiles';
  adminStoreLabel: string;
  adminStoreNote: string;
  adminsCount: number;
  systems: {
    id: string;
    label: string;
    status: 'ready' | 'attention';
    detail: string;
  }[];
}

function statusClasses(status: 'ready' | 'attention') {
  return status === 'ready'
    ? 'border-green-200 bg-green-50 text-green-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [overview, setOverview] = useState<AdminSettingsOverview | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        router.push('/admin/login');
        return;
      }

      const [overviewResult, adminsResult] = await Promise.all([
        getAdminSettingsOverview(),
        getAdmins(),
      ]);

      if (overviewResult.success && overviewResult.data) {
        setOverview(overviewResult.data);
      } else {
        setError(overviewResult.error || 'Failed to load system status');
      }

      if (adminsResult.success && adminsResult.admins) {
        setAdmins(adminsResult.admins);
      } else {
        setError(adminsResult.error || 'Failed to load admins');
      }

      setLoadingAdmins(false);
    };

    init();
  }, [router]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const result = await createAdminUser(email, password);

      if (!result.success) {
        setError(result.error || 'Failed to create admin');
        setLoading(false);
        return;
      }

      setSuccess(`Admin created: ${email}`);
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      const adminsResult = await getAdmins();
      if (adminsResult.success && adminsResult.admins) {
        setAdmins(adminsResult.admins);
      }

      const overviewResult = await getAdminSettingsOverview();
      if (overviewResult.success && overviewResult.data) {
        setOverview(overviewResult.data);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Store systems, admins, and access</p>
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          className="gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>

      {overview && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Admin Source</p>
                <h2 className="mt-1 text-xl font-bold">{overview.adminStoreLabel}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {overview.adminStoreNote}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overview.systems.map((system) => {
              const Icon =
                system.status === 'ready' ? CheckCircle2 : AlertCircle;

              return (
                <div
                  key={system.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{system.label}</p>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(system.status)}`}
                    >
                      <Icon className="h-3 w-3" />
                      {system.status === 'ready' ? 'Ready' : 'Check'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {system.detail}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/20 border border-destructive rounded-lg p-3 flex gap-2">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">Create New Admin</h2>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-2">Email</label>
              <Input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Password</label>
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">At least 8 characters</p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">Confirm Password</label>
              <Input
                type="password"
                placeholder="Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="gap-2 bg-primary text-white hover:bg-primary/90 w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Admin
                </>
              )}
            </Button>
          </form>
        </div>

        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-bold mb-6">
            Team Admins ({admins.length})
          </h2>

          {loadingAdmins ? (
            <p className="text-muted-foreground">Loading admins...</p>
          ) : admins.length === 0 ? (
            <p className="text-muted-foreground">No admins yet</p>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin.user_id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(admin.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded capitalize">
                    {admin.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
