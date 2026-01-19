import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createMediaAsset,
  getProject,
  getScriptById,
  getSelectedScriptByProject,
  getMediaAssetsByProject,
  updateProjectStep,
} from '@/lib/db-queries';
import { generateVoiceover } from '@/lib/services/replicate';
import { uploadFromUrl } from '@/lib/services/wasabi';
import { trackUsageAndCheckLimits } from '@/lib/middleware/usage-tracking';
import { z } from 'zod';

const generateVoiceoverSchema = z.object({
  scriptId: z.string().optional(),
  voice: z.enum(['male-1', 'male-2', 'female-1', 'female-2', 'female-3']).optional(),
  speed: z.number().min(0.5).max(2.0).optional(),
  pitch: z.number().min(-12).max(12).optional(),
  volume: z.number().min(0).max(100).optional(),
  emotion: z.enum(['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised']).optional(),
  cloneSampleUrl: z.string().url().optional(),
  voiceType: z.enum(['preset', 'clone']).optional(),
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

    // Get project
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // TODO: Check if user has access to the project's organization

    const body = await request.json();
    const options = generateVoiceoverSchema.parse(body);

    // Get the selected script
    const selectedScript = options.scriptId
      ? await getScriptById(projectId, options.scriptId)
      : await getSelectedScriptByProject(projectId);

    if (!selectedScript) {
      return NextResponse.json(
        { error: 'No script selected. Please generate a script first.' },
        { status: 400 }
      );
    }

    // Check usage limits before generating
    const scriptLength = selectedScript.content.length;
    const usageCheck = await trackUsageAndCheckLimits({
      organizationId: project.organizationId,
      userId: session.user.id,
      projectId,
      usageType: 'voiceover_generation',
      units: Math.ceil(scriptLength / 1000), // Count units based on script length
      cost: 0.005, // Approximate cost per voiceover (adjust based on actual costs)
      provider: 'replicate',
    });

    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason || 'Usage limit exceeded' },
        { status: 403 }
      );
    }

    // Generate voiceover using Replicate
    const voiceoverUrl = await generateVoiceover({
      text: selectedScript.content,
      voice: options.voice,
      speed: options.speed,
      pitch: options.pitch,
      volume: options.volume,
      emotion: options.emotion,
    });

    // Upload to Wasabi
    const uploadResult = await uploadFromUrl(voiceoverUrl, {
      organizationId: project.organizationId,
      projectId,
      assetType: 'audio',
      metadata: {
        type: 'voiceover',
        scriptId: selectedScript.id,
      },
    });

    // Save to database
    const asset = await createMediaAsset({
      projectId,
      type: 'voiceover',
      url: uploadResult.url,
      metadata: {
        voice: options.voice,
        voiceType: options.voiceType,
        cloneSampleUrl: options.cloneSampleUrl,
        speed: options.speed,
        pitch: options.pitch,
        volume: options.volume,
        emotion: options.emotion,
        scriptId: selectedScript.id,
      },
    });

    // Update project step
    await updateProjectStep(projectId, 'music');

    return NextResponse.json({ voiceover: asset }, { status: 201 });
  } catch (error) {
    console.error('Error generating voiceover:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate voiceover' },
      { status: 500 }
    );
  }
}

export async function GET(
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

    const voiceovers = await getMediaAssetsByProject(projectId, 'voiceover');
    return NextResponse.json({ voiceovers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching voiceovers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch voiceovers' },
      { status: 500 }
    );
  }
}
