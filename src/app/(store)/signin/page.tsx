import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth-actions';
import { SignInForm } from '@/components/auth/signin-form';

export const metadata = {
  title: 'Sign In',
  description: 'Sign in to your Jersey Rippers account',
};

export default async function SignInPage() {
  const { session } = await getSession();

  if (session) {
    redirect('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Sign In</h1>
          <p className="text-gray-400 mb-8">Welcome back to Jersey Rippers</p>

          <SignInForm />

          <p className="text-gray-400 text-sm mt-8 text-center">
            Don't have an account?{' '}
            <a href="/signup" className="text-red-600 hover:text-red-500">
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
