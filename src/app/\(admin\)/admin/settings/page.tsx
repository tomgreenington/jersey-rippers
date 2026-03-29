'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Plus, LogOut } from 'lucide-react';
import { createAdminUser, getAdmins } from '@/lib/supabase/admin-actions';
import { createClient } from '@supabase/supabase-js';

interface Admin {
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get current user and load admins
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        router.push('/admin/login');
        return;
      }

      setUserId(session.user.id);

      // Load admins
      const result = await getAdmins(session.user.id);
      if (result.success && result.admins) {
        setAdmins(result.admins);
      } else {
        setError(result.error || 'Failed to load admins');
      }
      setLoadingAdmins(false);
    };

    init();
  }, [router, supabase.auth]);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate
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

    if (!userId) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      const result = await createAdminUser(email, password, userId);

      if (!result.success) {
        setError(result.error || 'Failed to create admin');
        setLoading(false);
        return;
      }

      setSuccess(`Admin created: ${email}`);
      setEmail('');
      setPassword('');
      setConfirmPassword('');

      // Reload admins
      const adminsResult = await getAdmins(userId);
      if (adminsResult.success && adminsResult.admins) {
        setAdmins(adminsResult.admins);
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage admins and permissions</p>
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

      {/* Create Admin Form */}
      <div className="border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6">Create New Admin</h2>
        <form onSubmit={handleCreateAdmin} className="space-y-4 max-w-md">
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
              placeholder="••••••••"
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
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

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

      {/* Admins List */}
      <div className="border border-border rounded-lg p-6">
        <h2 className="text-xl font-bold mb-6">Team Admins ({admins.length})</h2>

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
                <span className="text-xs font-medium px-2 py-1 bg-primary/10 text-primary rounded">
                  {admin.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
