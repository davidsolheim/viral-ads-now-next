import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProfileSettingsClient } from '@/components/dashboard/profile-settings-client';
import { needsOnboarding } from '@/lib/db-queries';
import { isSuperAdmin } from '@/lib/admin-utils';

export default async function ProfileSettingsPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if onboarding is needed
  if (await needsOnboarding(session.user.id)) {
    redirect('/onboarding');
  }

  const userIsSuperAdmin = isSuperAdmin(session.user?.email);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        userEmail={session.user?.email || undefined}
        userName={session.user?.name || undefined}
        userImage={session.user?.image || null}
        activeOrganizationId={session.user?.activeOrganizationId || null}
        isSuperAdmin={userIsSuperAdmin}
      />
      <ProfileSettingsClient
        userId={session.user.id}
        initialName={session.user?.name || null}
        initialEmail={session.user?.email || ''}
        initialImage={session.user?.image || null}
      />
    </div>
  );
}
