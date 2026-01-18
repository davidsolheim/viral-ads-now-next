import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { needsOnboarding } from '@/lib/db-queries';

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if onboarding is needed
  if (await needsOnboarding(session.user.id)) {
    redirect('/onboarding');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        userEmail={session.user?.email || undefined}
        userName={session.user?.name || undefined}
        userImage={session.user?.image || null}
        activeOrganizationId={session.user?.activeOrganizationId || null}
      />
      <DashboardClient userId={session.user.id} organizationId={session.user?.activeOrganizationId || undefined} />
    </div>
  );
}
