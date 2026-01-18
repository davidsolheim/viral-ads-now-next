import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject, needsOnboarding } from '@/lib/db-queries';
import { ProjectWizard } from '@/components/wizard/project-wizard';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const session = await auth();
  const { projectId } = await params;

  if (!session) {
    redirect('/auth/signin');
  }

  // Check if onboarding is needed
  if (await needsOnboarding(session.user.id)) {
    redirect('/onboarding');
  }

  const project = await getProject(projectId);

  if (!project) {
    redirect('/dashboard');
  }

  // TODO: Check if user has access to this project's organization

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        userEmail={session.user?.email || undefined}
        userName={session.user?.name || undefined}
        userImage={session.user?.image || null}
        activeOrganizationId={session.user?.activeOrganizationId || null}
      />
      <ProjectWizard project={project} />
    </div>
  );
}
