import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject } from '@/lib/db-queries';
import { enhancePrompt } from '@/lib/services/openai';
import { z } from 'zod';

const enhancePromptSchema = z.object({
  prompt: z.string().min(1),
  type: z.enum(['image', 'video']),
  context: z.object({
    sceneNumber: z.number().optional(),
    script: z.string().optional(),
  }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sceneId: string }> }
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

    const body = await request.json();
    const { prompt, type, context } = enhancePromptSchema.parse(body);

    const enhanced = await enhancePrompt(prompt, type, {
      sceneNumber: context?.sceneNumber,
      script: context?.script,
    });

    return NextResponse.json({ enhancedPrompt: enhanced }, { status: 200 });
  } catch (error) {
    console.error('Error enhancing prompt:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to enhance prompt' },
      { status: 500 }
    );
  }
}
