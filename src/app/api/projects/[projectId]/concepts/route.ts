import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProject,
  getProductByProject,
  createScript,
  createScene,
  createMediaAsset,
  deleteScenesByProject,
  updateProjectStep,
  updateProjectStyle,
  updateProjectSettings,
} from '@/lib/db-queries';
import {
  generateScriptCandidates,
  breakdownIntoScenes,
  getStyleSettings,
  type AdStyle,
} from '@/lib/services/openai';
import { generateImageCandidates } from '@/lib/services/replicate';
import { uploadFromUrl } from '@/lib/services/wasabi';
import { z } from 'zod';

const generateConceptsSchema = z.object({
  style: z.enum(['conversational', 'energetic', 'professional', 'casual', 'sex_appeal']),
  duration: z.number().min(15).max(60).default(30),
  aspectRatio: z.enum(['portrait', 'landscape', 'square']).default('portrait'),
});

// Calculate image dimensions based on aspect ratio
function getImageDimensions(aspectRatio: 'portrait' | 'landscape' | 'square', isPreview: boolean = true) {
  // Use lower resolution for preview images
  if (isPreview) {
    switch (aspectRatio) {
      case 'portrait':
        return { width: 576, height: 1024 }; // 9:16
      case 'landscape':
        return { width: 1024, height: 576 }; // 16:9
      case 'square':
        return { width: 1024, height: 1024 }; // 1:1
    }
  } else {
    // Higher resolution for final images
    switch (aspectRatio) {
      case 'portrait':
        return { width: 1080, height: 1920 }; // 9:16
      case 'landscape':
        return { width: 1920, height: 1080 }; // 16:9
      case 'square':
        return { width: 1080, height: 1080 }; // 1:1
    }
  }
}

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

    // Get product data
    const product = await getProductByProject(projectId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product data not found. Please complete the product step first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { style, duration, aspectRatio } = generateConceptsSchema.parse(body);

    // Update project style and settings (save immediately)
    await updateProjectStyle(projectId, style);
    await updateProjectSettings(projectId, {
      duration,
      aspectRatio,
      conceptGeneration: {
        status: 'in_progress',
        totalCandidates: 3,
        completed: 0,
        startedAt: new Date().toISOString(),
      },
      ...(project.settings || {}),
    });

    // Get style settings
    const styleSettings = getStyleSettings(style as AdStyle);

    // Calculate image dimensions for preview
    const imageDimensions = getImageDimensions(aspectRatio, true);

    console.log(`[${projectId}] Generating 3 concept candidates...`);

    // Generate 3 script candidates
    const scriptCandidates = await generateScriptCandidates(
      {
        product: {
          name: product.name,
          description: product.description || undefined,
          price: product.price || undefined,
          originalPrice: product.originalPrice || undefined,
          features: (product.features as string[]) || undefined,
          benefits: (product.benefits as string[]) || undefined,
        },
        style: style as AdStyle,
        duration,
        platform: 'tiktok',
      },
      3 // Generate 3 candidates
    );

    console.log(`[${projectId}] Generated ${scriptCandidates.length} script candidates. Creating concepts...`);

    // Generate concepts sequentially to ensure each is saved before moving to next
    const concepts = [];
    for (let index = 0; index < scriptCandidates.length; index++) {
      const scriptContent = scriptCandidates[index];
      try {
        console.log(`[${projectId}] Creating concept ${index + 1}/${scriptCandidates.length}...`);
        
        // Step 1: Create script (save immediately)
        const script = await createScript({
          projectId,
          content: scriptContent,
          isSelected: false,
        });
        console.log(`[${projectId}] Concept ${index + 1}: Script saved (${script.id})`);

        // Step 2: Break script into scenes
        const sceneData = await breakdownIntoScenes({
          script: scriptContent,
          targetScenes: Math.max(3, Math.floor(duration / 7)), // ~7 seconds per scene
        });

        // Step 3: Create scenes in database (save immediately, one by one)
        const createdScenes = [];
        for (const scene of sceneData) {
          const createdScene = await createScene({
            projectId,
            scriptId: script.id,
            sceneNumber: scene.sceneNumber,
            scriptText: scene.scriptText,
            visualDescription: scene.visualDescription,
          });
          createdScenes.push(createdScene);
        }
        console.log(`[${projectId}] Concept ${index + 1}: ${createdScenes.length} scenes saved`);

        // Step 4: Generate preview images for each scene (save as we go)
        const scenesWithImages = [];
        for (let sceneIndex = 0; sceneIndex < createdScenes.length; sceneIndex++) {
          const createdScene = createdScenes[sceneIndex];
          const scene = sceneData[sceneIndex];
          
          try {
            // Generate 1 preview image per scene
            const imageUrls = await generateImageCandidates(
              {
                prompt: scene.visualDescription,
                style: styleSettings.imageStyle,
                width: imageDimensions.width,
                height: imageDimensions.height,
              },
              1 // Just 1 preview image
            );

            const previewImageUrl = imageUrls[0];

            // Upload preview image to Wasabi
            const uploadResult = await uploadFromUrl(previewImageUrl, {
              organizationId: project.organizationId,
              projectId,
              assetType: 'images',
              metadata: {
                scriptId: script.id,
                sceneId: createdScene.id,
                sceneNumber: scene.sceneNumber.toString(),
                isPreview: 'true',
              },
            });

            // Save preview image as media asset (save immediately)
            await createMediaAsset({
              projectId,
              sceneId: createdScene.id,
              type: 'image',
              url: uploadResult.url,
              metadata: {
                scriptId: script.id,
                sceneNumber: scene.sceneNumber,
                isPreview: true,
              },
            });

            scenesWithImages.push({
              scene: {
                id: createdScene.id,
                sceneNumber: scene.sceneNumber,
                scriptText: scene.scriptText,
                visualDescription: scene.visualDescription,
              },
              previewImageUrl: uploadResult.url,
            });
            
            console.log(`[${projectId}] Concept ${index + 1}: Scene ${scene.sceneNumber} image saved`);
          } catch (imageError) {
            console.error(`[${projectId}] Error generating image for scene ${scene.sceneNumber}:`, imageError);
            // Continue with other scenes even if one image fails
            scenesWithImages.push({
              scene: {
                id: createdScene.id,
                sceneNumber: scene.sceneNumber,
                scriptText: scene.scriptText,
                visualDescription: scene.visualDescription,
              },
              previewImageUrl: null, // Mark as missing but continue
            });
          }
        }

        concepts.push({
          id: script.id,
          script: scriptContent,
          scenes: scenesWithImages.map(({ scene, previewImageUrl }) => ({
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            scriptText: scene.scriptText,
            visualDescription: scene.visualDescription,
            previewImageUrl,
          })),
        });
        
        // Update progress in settings (get latest project to merge settings correctly)
        const latestProject = await getProject(projectId);
        await updateProjectSettings(projectId, {
          ...(latestProject?.settings || {}),
          conceptGeneration: {
            status: 'in_progress',
            totalCandidates: scriptCandidates.length,
            completed: concepts.length,
            startedAt: (latestProject?.settings as any)?.conceptGeneration?.startedAt || new Date().toISOString(),
          },
        });
        
        console.log(`[${projectId}] Concept ${index + 1} completed`);
      } catch (error) {
        console.error(`[${projectId}] Error generating concept ${index + 1}:`, error);
        // Continue with other concepts even if one fails
        // Partial data is already saved in database
      }
    }

    console.log(`[${projectId}] Generated ${concepts.length}/${scriptCandidates.length} concepts. Updating project step...`);

    // Update progress in settings (mark as completed - get latest project)
    const latestProject = await getProject(projectId);
    await updateProjectSettings(projectId, {
      ...(latestProject?.settings || {}),
      conceptGeneration: {
        status: concepts.length > 0 ? 'completed' : 'failed',
        totalCandidates: scriptCandidates.length,
        completed: concepts.length,
        completedAt: new Date().toISOString(),
      },
    });

    // Update project step to concept (even if some concepts failed)
    await updateProjectStep(projectId, 'concept');

    return NextResponse.json(
      {
        success: true,
        concepts,
        partial: concepts.length < scriptCandidates.length, // Indicate if partial completion
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error generating concepts:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate concepts' },
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

    // Get project
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get all unselected scripts (concept candidates)
    const { getScriptsByProject } = await import('@/lib/db-queries');
    const scripts = await getScriptsByProject(projectId);
    const candidateScripts = scripts.filter((s: any) => !s.isSelected);

    // Get scenes and preview images for each script
    const { getScenesByScript, getMediaAssetsByProject } = await import('@/lib/db-queries');
    const allImages = await getMediaAssetsByProject(projectId, 'image');

    const concepts = await Promise.all(
      candidateScripts.map(async (script: any) => {
        const scenes = await getScenesByScript(projectId, script.id);
        const scenesWithImages = scenes.map((scene: any) => {
          // Find preview image for this scene
          const previewImage = allImages.find(
            (img: any) =>
              img.sceneId === scene.id &&
              (img.metadata as any)?.isPreview === true
          );
          return {
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            scriptText: scene.scriptText,
            visualDescription: scene.visualDescription,
            previewImageUrl: previewImage?.url || null,
          };
        });

        return {
          id: script.id,
          script: script.content,
          scenes: scenesWithImages,
        };
      })
    );

    return NextResponse.json({ concepts }, { status: 200 });
  } catch (error) {
    console.error('Error fetching concepts:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch concepts' },
      { status: 500 }
    );
  }
}
