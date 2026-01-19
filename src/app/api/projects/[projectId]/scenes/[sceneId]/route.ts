import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, updateScene } from '@/lib/db-queries';
import { z } from 'zod';

const updateSceneSchema = z.object({
  imagePrompt: z.string().max(300).optional(),
  videoPrompt: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sceneId: string }> }
) {
  try {
    const session = await auth();
    const { projectId, sceneId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = updateSceneSchema.parse(body);

    const updateData: any = {};
    if (data.imagePrompt !== undefined) updateData.imagePrompt = data.imagePrompt;
    if (data.videoPrompt !== undefined) {
      updateData.metadata = { videoPrompt: data.videoPrompt };
    }

    const updated = await updateScene(sceneId, updateData);

    return NextResponse.json({ scene: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating scene:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update scene' },
      { status: 500 }
    );
  }
}
