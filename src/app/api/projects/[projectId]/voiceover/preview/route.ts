import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, getSelectedScriptByProject } from '@/lib/db-queries';
import { generateVoiceover } from '@/lib/services/replicate';
import { z } from 'zod';

const previewSchema = z.object({
  voice: z.enum(['male-1', 'male-2', 'female-1', 'female-2', 'female-3']).optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
  pitch: z.number().min(-12).max(12).optional(),
  volume: z.number().min(0).max(100).optional(),
  emotion: z.enum(['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']).optional(),
});

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

    const script = await getSelectedScriptByProject(projectId);
    if (!script) {
      return NextResponse.json({ error: 'No script selected' }, { status: 400 });
    }

    const body = await request.json();
    const options = previewSchema.parse(body);

    const previewText = script.content.slice(0, 300);
    const audioUrl = await generateVoiceover({
      text: previewText,
      voice: options.voice,
      speed: options.speed,
      pitch: options.pitch,
      volume: options.volume,
      emotion: options.emotion,
    });

    return NextResponse.json({ url: audioUrl }, { status: 200 });
  } catch (error) {
    console.error('Error generating voiceover preview:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
