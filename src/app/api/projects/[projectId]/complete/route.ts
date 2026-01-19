import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, updateProjectStatus, updateProjectStep } from '@/lib/db-queries';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    const { projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    await updateProjectStatus(projectId, 'completed');
    await updateProjectStep(projectId, 'complete');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error completing project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete project' },
      { status: 500 }
    );
  }
}
