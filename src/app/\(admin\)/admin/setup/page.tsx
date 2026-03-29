'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2, Check } from 'lucide-react';
import { createFirstAdmin } from '@/lib/supabase/admin-actions';
import { adminsExist } from '@/lib/supabase/admin-auth';

export default function AdminSetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check if admins already exist
  useEffect(() => {
    const check = async () => {
      const exists = await adminsExist();
      setAdminExists(exists);
      setChecking(false);
    };
    check();
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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

    try {
      const result = await createFirstAdmin(email, password);

      if (!result.success) {
        setError(result.error || 'Failed to create admin');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/login');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
        <p className="text-muted-foreground">Checking...</p>
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Setup Complete</h1>
          <p className="text-muted-foreground mb-6">An admin account already exists. Please log in instead.</p>
          <Button
            onClick={() => router.push('/admin/login')}
            className="w-full bg-primary text-white hover:bg-primary/90"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-8 text-center">
          <Check className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Success!</h1>
          <p className="text-muted-foreground">Admin account created. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">BUCKS BREAKS</h1>
          <p className="text-sm text-muted-foreground mt-2">Create First Admin Account</p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
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

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 bg-primary text-white hover:bg-primary/90"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Admin Account'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
