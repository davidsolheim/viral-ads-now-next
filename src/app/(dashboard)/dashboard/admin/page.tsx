import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { AdminDashboardClient } from '@/components/dashboard/admin-dashboard-client';
import { needsOnboarding } from '@/lib/db-queries';
import { isSuperAdmin } from '@/lib/admin-utils';

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if onboarding is needed
  if (await needsOnboarding(session.user.id)) {
    redirect('/onboarding');
  }

  // Check if user is super admin
  if (!isSuperAdmin(session.user?.email)) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        userEmail={session.user?.email || undefined}
        userName={session.user?.name || undefined}
        userImage={session.user?.image || null}
        activeOrganizationId={session.user?.activeOrganizationId || null}
        isSuperAdmin={true}
      />
      <AdminDashboardClient />
    </div>
  );
}