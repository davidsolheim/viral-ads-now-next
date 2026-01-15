import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getProject, 
  getScenesByProject, 
  getMediaAssetsByProject,
  createFinalVideo,
  updateProjectStep 
} from '@/lib/db-queries';
import { compileVideo } from '@/lib/services/shotstack';
import { uploadFromUrl } from '@/lib/services/wasabi';
import { z } from 'zod';

const compileVideoSchema = z.object({
  musicVolume: z.number().min(0).max(1).optional(),
  resolution: z.enum(['480p', '720p', '1080p', '4k']).optional(),
  includeCaptions: z.boolean().optional(),
  captionStyle: z.object({
    font: z.string().optional(),
    fontSize: z.number().optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    position: z.enum(['top', 'center', 'bottom']).optional(),
  }).optional(),
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
    const options = compileVideoSchema.parse(body);

    // Get scenes and assets in parallel
    const [scenes, allAssets] = await Promise.all([
      getScenesByProject(projectId),
      getMediaAssetsByProject(projectId),
    ]);
    if (scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found. Please generate scenes first.' },
        { status: 400 }
      );
    }

    const images = allAssets.filter((a: any) => a.type === 'image');
    const voiceovers = allAssets.filter((a: any) => a.type === 'voiceover');
    const music = allAssets.filter((a: any) => a.type === 'music');

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images found. Please generate images first.' },
        { status: 400 }
      );
    }

    const imagesBySceneId = new Map<string, any>();
    const imagesBySceneNumber = new Map<number, any>();
    for (const image of images) {
      if (image.sceneId) {
        imagesBySceneId.set(image.sceneId, image);
      }
      const sceneNumber = (image.metadata as any)?.sceneNumber;
      if (typeof sceneNumber === 'number') {
        imagesBySceneNumber.set(sceneNumber, image);
      }
    }

    // Build video clips from images and scenes
    const clips = scenes.map((scene: any) => {
      const sceneImage =
        imagesBySceneId.get(scene.id) || imagesBySceneNumber.get(scene.sceneNumber);

      if (!sceneImage) {
        throw new Error(`No image found for scene ${scene.sceneNumber}`);
      }

      return {
        type: 'image' as const,
        url: sceneImage.url,
        duration: 5, // Default 5 seconds per scene
        transition: 'fade' as const,
      };
    });

    // Prepare captions if requested
    let captions = undefined;
    if (options.includeCaptions) {
      let currentTime = 0;
      captions = scenes.map((scene: any) => {
        const caption = {
          text: scene.scriptText,
          start: currentTime,
          duration: 5, // Match clip duration
        };
        currentTime += 5;
        return caption;
      });
    }

    // Compile video using Shotstack
    const videoUrl = await compileVideo({
      clips,
      voiceoverUrl: voiceovers[0]?.url,
      musicUrl: music[0]?.url,
      musicVolume: options.musicVolume ?? 0.3,
      captions,
      captionStyle: options.captionStyle,
      resolution: options.resolution ?? '1080p',
      format: 'mp4',
    });

    // Upload final video to Wasabi
    const uploadResult = await uploadFromUrl(videoUrl, {
      organizationId: project.organizationId,
      projectId,
      assetType: 'master',
      metadata: {
        type: 'final_video',
        resolution: options.resolution ?? '1080p',
      },
    });

    // Calculate total duration
    const totalDuration = clips.reduce((sum: number, clip: any) => sum + clip.duration, 0);

    // Save final video to database
    const finalVideo = await createFinalVideo({
      projectId,
      url: uploadResult.url,
      durationSeconds: totalDuration,
      resolution: options.resolution ?? '1080p',
      metadata: {
        musicVolume: options.musicVolume,
        includeCaptions: options.includeCaptions,
        captionStyle: options.captionStyle,
      },
    });

    // Update project step
    await updateProjectStep(projectId, 'complete');

    return NextResponse.json({ video: finalVideo }, { status: 201 });
  } catch (error) {
    console.error('Error compiling video:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compile video' },
      { status: 500 }
    );
  }
}
