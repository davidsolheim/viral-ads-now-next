import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { needsOnboarding } from '@/lib/db-queries';
import { OnboardingClient } from '@/components/onboarding/onboarding-client';

export default async function OnboardingPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if onboarding is actually needed
  const needsOnboardingCheck = await needsOnboarding(session.user.id);
  
  if (!needsOnboardingCheck) {
    // User has already completed onboarding, redirect to dashboard
    redirect('/dashboard');
  }

  return (
    <OnboardingClient
      userId={session.user.id}
      initialName={session.user?.name || null}
      email={session.user?.email || ''}
      image={session.user?.image || null}
    />
  );
}