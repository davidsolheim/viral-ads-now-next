import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getProject, 
  getScenesByProject, 
  createMediaAsset,
  updateProjectStep 
} from '@/lib/db-queries';
import { generateImage } from '@/lib/services/replicate';
import { uploadFromUrl } from '@/lib/services/wasabi';
import { z } from 'zod';

const generateImagesSchema = z.object({
  style: z.enum(['photorealistic', 'artistic', 'cinematic', 'product']).optional(),
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

    // Get scenes
    const scenes = await getScenesByProject(projectId);
    if (scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found. Please generate scenes first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const options = generateImagesSchema.parse(body);

    // Generate images for each scene in parallel
    const imagePromises = scenes.map(async (scene: any) => {
      try {
        // Generate image using Replicate
        const imageUrl = await generateImage({
          prompt: scene.visualDescription,
          style: options.style,
          width: 1024,
          height: 1024,
        });

        // Upload to Wasabi
        const uploadResult = await uploadFromUrl(imageUrl, {
          organizationId: project.organizationId,
          projectId,
          assetType: 'images',
          metadata: {
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber.toString(),
          },
        });

        // Save to database
        const asset = await createMediaAsset({
          projectId,
          sceneId: scene.id,
          type: 'image',
          url: uploadResult.url,
          metadata: {
            sceneNumber: scene.sceneNumber,
            visualDescription: scene.visualDescription,
            style: options.style,
          },
        });

        return {
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          asset,
        };
      } catch (error) {
        console.error(`Error generating image for scene ${scene.sceneNumber}:`, error);
        throw error;
      }
    });

    const results = await Promise.all(imagePromises);

    // Update project step
    await updateProjectStep(projectId, 'video');

    return NextResponse.json({ images: results }, { status: 201 });
  } catch (error) {
    console.error('Error generating images:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate images' },
      { status: 500 }
    );
  }
}
