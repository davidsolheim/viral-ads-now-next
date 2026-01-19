import { signIn } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Image from 'next/image';

import { cookies } from 'next/headers';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; ref?: string }>;
}) {
  const { callbackUrl, ref } = await searchParams;
  
  // Store referral code in cookie if present
  if (ref) {
    const cookieStore = await cookies();
    cookieStore.set('referral_code', ref, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  async function handleGoogleSignIn() {
    'use server';
    await signIn('google', { redirectTo: callbackUrl || '/dashboard' });
  }

  async function handleEmailSignIn(formData: FormData) {
    'use server';
    const email = formData.get('email') as string;
    if (!email) return;
    
    await signIn('resend', { 
      email, 
      redirectTo: callbackUrl || '/dashboard' 
    });
    redirect('/auth/verify');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <div className="text-center">
          <Image
            src="/icon.svg"
            alt="Viral Ads Now"
            width={64}
            height={64}
            className="mx-auto h-16 w-16 rounded-xl mb-4"
          />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Viral Ads Now
          </h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to create instant video ads
          </p>
        </div>
        
        <div className="relative h-32 w-full overflow-hidden rounded-lg">
          <Image
            src="/banner.png"
            alt="Viral Ads Now"
            fill
            className="object-cover"
          />
        </div>

        <div className="mt-8 space-y-4">
          <form action={handleGoogleSignIn}>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-surface px-2 text-subtle">Or</span>
            </div>
          </div>

          <form action={handleEmailSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-offset-2"
            >
              Continue with Email
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-subtle">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
