import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InferSelectModel } from 'drizzle-orm';
import { scenes, mediaAssets } from '@/db/schema/projects';
import {
  getProject,
  getScenesByProject,
  getMediaAssetsByScene,
  createMediaAsset,
  updateProjectStep,
  getMediaAssetsByProject,
} from '@/lib/db-queries';

type Scene = InferSelectModel<typeof scenes>;
type MediaAsset = InferSelectModel<typeof mediaAssets>;
import { animateVideo, generateKlingVideo } from '@/lib/services/replicate';
import { uploadFromUrl } from '@/lib/services/wasabi';
import { z } from 'zod';

const generateVideoSchema = z.object({
  sceneId: z.string(),
  prompt: z.string().optional(),
  model: z.string().optional(),
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

    const body = await request.json();
    const options = generateVideoSchema.parse(body);

    const scenes = await getScenesByProject(projectId);
    const scene = scenes.find((s: Scene) => s.id === options.sceneId);
    if (!scene) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 });
    }

    const sceneImages = await getMediaAssetsByScene(scene.id);
    const latestImage = sceneImages.find((asset: MediaAsset) => asset.type === 'image');
    if (!latestImage) {
      return NextResponse.json(
        { error: 'No image found for this scene. Generate images first.' },
        { status: 400 }
      );
    }

    const prompt = options.prompt || (scene.metadata as any)?.videoPrompt || scene.visualDescription;
    const model = options.model || 'kling-v2-6';

    const isKling = model.includes('kling');
    const videoUrl = isKling
      ? await generateKlingVideo({ imageUrl: latestImage.url, prompt, model })
      : await animateVideo({ imageUrl: latestImage.url, prompt, model });

    const uploadResult = await uploadFromUrl(videoUrl, {
      organizationId: project.organizationId,
      projectId,
      assetType: 'video',
      metadata: {
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber.toString(),
      },
    });

    const asset = await createMediaAsset({
      projectId,
      sceneId: scene.id,
      type: 'video_clip',
      url: uploadResult.url,
      metadata: {
        sceneNumber: scene.sceneNumber,
        model,
        prompt,
      },
    });

    await updateProjectStep(projectId, 'voiceover');

    return NextResponse.json({ video: asset }, { status: 201 });
  } catch (error) {
    console.error('Error generating video:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate video' },
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

    const videos = await getMediaAssetsByProject(projectId, 'video_clip');
    return NextResponse.json({ videos }, { status: 200 });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
