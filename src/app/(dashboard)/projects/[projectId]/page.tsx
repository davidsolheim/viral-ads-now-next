import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getProject } from '@/lib/db-queries';
import { ProjectWizard } from '@/components/wizard/project-wizard';

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

  const project = await getProject(projectId);

  if (!project) {
    redirect('/dashboard');
  }

  // TODO: Check if user has access to this project's organization

  return <ProjectWizard project={project} />;
}
