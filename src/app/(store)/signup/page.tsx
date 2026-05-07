import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth-actions';
import { SignUpForm } from '@/components/auth/signup-form';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: 'Sign Up',
  description: `Create your ${BRAND.name} account`,
};

export default async function SignUpPage() {
  const { session } = await getSession();

  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
          <p className="text-gray-400 mb-8">Join {BRAND.name}</p>

          <SignUpForm />

          <p className="text-gray-400 text-sm mt-8 text-center">
            Already have an account?{' '}
            <a href="/signin" className="text-red-600 hover:text-red-500">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
