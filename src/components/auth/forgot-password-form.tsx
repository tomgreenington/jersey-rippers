'use client';

import { useState } from 'react';
import { resetPassword } from '@/lib/supabase/auth-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const result = await resetPassword(email);

    if (!result.success) {
      setError(result.error || 'Failed to send reset email');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setEmail('');
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-900/20 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-900/20 border border-green-700 text-green-300 px-4 py-3 rounded text-sm">
          Check your email for a password reset link
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Email
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={loading || success}
        />
      </div>

      <Button
        type="submit"
        disabled={loading || success}
        className="w-full bg-red-600 hover:bg-red-700 text-white"
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
      </Button>
    </form>
  );
}
