'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!data.user?.id) {
        setError('Login failed');
        setLoading(false);
        return;
      }

      // Verify user is admin
      const res = await fetch('/api/admin/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id }),
      });

      const { isAdmin } = await res.json();

      if (!isAdmin) {
        // Sign out if not admin
        await supabase.auth.signOut();
        setError('You do not have admin access');
        setLoading(false);
        return;
      }

      // Redirect to inventory
      router.push('/admin/inventory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">BUCKS BREAKS</h1>
          <p className="text-sm text-muted-foreground mt-2">Admin Portal</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-border text-center text-sm text-muted-foreground">
          <p>First time? <Link href="/admin/setup" className="text-primary hover:underline font-medium">Create first admin account</Link></p>
        </div>
      </div>
    </div>
  );
}
