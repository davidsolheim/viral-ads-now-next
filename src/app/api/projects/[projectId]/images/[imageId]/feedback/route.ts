import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, updateMediaAsset } from '@/lib/db-queries';
import { z } from 'zod';

const feedbackSchema = z.object({
  feedback: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; imageId: string }> }
) {
  try {
    const session = await auth();
    const { projectId, imageId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { feedback } = feedbackSchema.parse(body);

    const updated = await updateMediaAsset(imageId, {
      metadata: {
        feedback,
        feedbackAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ asset: updated }, { status: 200 });
  } catch (error) {
    console.error('Error saving image feedback:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save feedback' },
      { status: 500 }
    );
  }
}
