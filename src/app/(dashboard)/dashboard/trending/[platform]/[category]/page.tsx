import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { TrendingPageClient } from '@/components/dashboard/trending-page-client';
import { needsOnboarding } from '@/lib/db-queries';

export default async function TrendingCategoryPage({
  params,
}: {
  params: Promise<{ platform: string; category: string }>;
}) {
  const session = await auth();
  const { platform, category } = await params;

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if onboarding is needed
  if (await needsOnboarding(session.user.id)) {
    redirect('/onboarding');
  }

  // Decode category from URL (it might be URL encoded)
  const decodedCategory = decodeURIComponent(category);

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        userEmail={session.user?.email || undefined}
        userName={session.user?.name || undefined}
        userImage={session.user?.image || null}
        activeOrganizationId={session.user?.activeOrganizationId || null}
      />
      <TrendingPageClient initialPlatform={platform as any} initialCategory={decodedCategory} />
    </div>
  );
}
