import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProductLibraryClient } from '@/components/dashboard/product-library-client';
import { needsOnboarding } from '@/lib/db-queries';
import { isSuperAdmin } from '@/lib/admin-utils';

export default async function ProductsPage() {
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
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductLibraryClient
          userId={session.user.id}
          organizationId={session.user?.activeOrganizationId || 'default-org'}
        />
      </main>
    </div>
  );
}
