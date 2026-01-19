import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, getScriptById, updateScript } from '@/lib/db-queries';
import { z } from 'zod';

const updateScriptSchema = z.object({
  content: z.string().min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; scriptId: string }> }
) {
  try {
    const session = await auth();
    const { projectId, scriptId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const script = await getScriptById(projectId, scriptId);
    if (!script) {
      return NextResponse.json({ error: 'Script not found' }, { status: 404 });
    }

    const body = await request.json();
    const { content } = updateScriptSchema.parse(body);

    const updatedScript = await updateScript(scriptId, {
      content,
    });

    return NextResponse.json({ script: updatedScript }, { status: 200 });
  } catch (error) {
    console.error('Error updating script:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update script' },
      { status: 500 }
    );
  }
}
