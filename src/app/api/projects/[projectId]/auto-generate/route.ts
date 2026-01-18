import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getProject,
  getProductByProject,
  createScript,
  deleteScenesByProject,
  createScene,
  createMediaAsset,
  updateProjectStep,
  updateProjectStyle,
  updateProjectSettings,
  getSelectedScriptByProject,
  getScenesByProject,
  getScenesByScript,
} from '@/lib/db-queries';
import {
  generateScriptCandidates,
  selectBestScript,
  selectBestImage,
  breakdownIntoScenes,
  getStyleSettings,
  type AdStyle,
} from '@/lib/services/openai';
import { generateImageCandidates } from '@/lib/services/replicate';
import { generateVoiceover } from '@/lib/services/replicate';
import { uploadFromUrl } from '@/lib/services/wasabi';
import { z } from 'zod';

const autoGenerateSchema = z.object({
  style: z.enum(['conversational', 'energetic', 'professional', 'casual', 'sex_appeal']),
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

    // Get product data
    const product = await getProductByProject(projectId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product data not found. Please complete the product step first.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { style } = autoGenerateSchema.parse(body);

    // Get project settings for duration and aspect ratio
    const settings = (project.settings as any) || {};
    const duration = settings.duration || 30;
    const aspectRatio = settings.aspectRatio || 'portrait';

    // Check if storyboard already exists (selected script + scenes)
    const selectedScript = await getSelectedScriptByProject(projectId);
    let script: any;
    let scenes: any[];

    if (selectedScript) {
      // Use existing storyboard
      console.log(`[${projectId}] Using existing storyboard (script ${selectedScript.id})...`);
      script = selectedScript;
      scenes = await getScenesByScript(projectId, selectedScript.id);
      
      if (scenes.length === 0) {
        // Fallback: get all scenes for project
        scenes = await getScenesByProject(projectId);
      }
    } else {
      // Generate new script and scenes (backward compatibility)
      if (style) {
        await updateProjectStyle(projectId, style);
      }

      // Get style settings
      const styleSettings = getStyleSettings((style || project.adStyle) as AdStyle);

      console.log(`[${projectId}] No storyboard found. Generating script and scenes...`);
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
          style: (style || project.adStyle) as AdStyle,
          duration,
          platform: 'tiktok',
        },
        2
      );

      const bestScriptIndex = await selectBestScript(scriptCandidates, {
        name: product.name,
        description: product.description || undefined,
        price: product.price || undefined,
        originalPrice: product.originalPrice || undefined,
        features: (product.features as string[]) || undefined,
        benefits: (product.benefits as string[]) || undefined,
      }, (style || project.adStyle) as AdStyle);

      const selectedScriptContent = scriptCandidates[bestScriptIndex];

      script = await createScript({
        projectId,
        content: selectedScriptContent,
        isSelected: true,
      });

      const sceneData = await breakdownIntoScenes({
        script: selectedScriptContent,
        targetScenes: Math.max(3, Math.floor(duration / 7)),
      });

      await deleteScenesByProject(projectId);

      scenes = await Promise.all(
        sceneData.map((scene) =>
          createScene({
            projectId,
            scriptId: script.id,
            sceneNumber: scene.sceneNumber,
            scriptText: scene.scriptText,
            visualDescription: scene.visualDescription,
          })
        )
      );
    }

    // Get style settings
    const styleSettings = getStyleSettings((style || project.adStyle || 'conversational') as AdStyle);

    console.log(`[${projectId}] Using ${scenes.length} scenes. Generating final images...`);

    // Update progress tracking (get latest project for settings)
    const currentProject = await getProject(projectId);
    await updateProjectSettings(projectId, {
      ...(currentProject?.settings || {}),
      autoGenerate: {
        status: 'in_progress',
        step: 'images',
        totalScenes: scenes.length,
        completedImages: 0,
        startedAt: new Date().toISOString(),
      },
    });

    // Calculate image dimensions based on aspect ratio
    function getImageDimensions(aspectRatio: string) {
      switch (aspectRatio) {
        case 'portrait':
          return { width: 1080, height: 1920 };
        case 'landscape':
          return { width: 1920, height: 1080 };
        case 'square':
          return { width: 1080, height: 1080 };
        default:
          return { width: 1080, height: 1920 };
      }
    }

    const imageDimensions = getImageDimensions(aspectRatio);

    // Step 3: Generate final images for each scene with candidate selection
    // Generate sequentially to save each image as it's created
    const imageResults = [];
    for (const scene of scenes) {
      try {
        console.log(`[${projectId}] Generating final image for scene ${scene.sceneNumber}...`);
        
        // Generate 2 image candidates with correct aspect ratio
        const imageUrls = await generateImageCandidates(
          {
            prompt: scene.visualDescription,
            style: styleSettings.imageStyle,
            width: imageDimensions.width,
            height: imageDimensions.height,
          },
          2
        );

        // Select best image using LLM
        const candidates = imageUrls.map((url) => ({
          url,
          prompt: scene.visualDescription,
        }));

        const bestImageIndex = await selectBestImage(
          candidates,
          scene.visualDescription,
          (style || project.adStyle || 'conversational') as AdStyle
        );

        const selectedImageUrl = imageUrls[bestImageIndex];

        // Upload to Wasabi
        const uploadResult = await uploadFromUrl(selectedImageUrl, {
          organizationId: project.organizationId,
          projectId,
          assetType: 'images',
          metadata: {
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber.toString(),
            isPreview: false, // Mark as final image
          },
        });

        // Save to database immediately
        const asset = await createMediaAsset({
          projectId,
          sceneId: scene.id,
          type: 'image',
          url: uploadResult.url,
          metadata: {
            sceneNumber: scene.sceneNumber,
            visualDescription: scene.visualDescription,
            style: styleSettings.imageStyle,
            isPreview: false,
          },
        });

        imageResults.push({
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          asset,
        });
        
        // Update progress after each image (get latest project)
        const latestProject = await getProject(projectId);
        await updateProjectSettings(projectId, {
          ...(latestProject?.settings || {}),
          autoGenerate: {
            status: 'in_progress',
            step: 'images',
            totalScenes: scenes.length,
            completedImages: imageResults.length,
            startedAt: (latestProject?.settings as any)?.autoGenerate?.startedAt || new Date().toISOString(),
          },
        });
        
        console.log(`[${projectId}] Scene ${scene.sceneNumber} final image saved`);
      } catch (error) {
        console.error(`[${projectId}] Error generating image for scene ${scene.sceneNumber}:`, error);
        // Continue with other scenes even if one fails
        // Previous images are already saved
      }
    }

    console.log(`[${projectId}] ${imageResults.length}/${scenes.length} images generated. Creating voiceover...`);

    // Update progress to voiceover step (get latest project)
    const projectForVoiceover = await getProject(projectId);
    await updateProjectSettings(projectId, {
      ...(projectForVoiceover?.settings || {}),
      autoGenerate: {
        status: 'in_progress',
        step: 'voiceover',
        totalScenes: scenes.length,
        completedImages: imageResults.length,
        startedAt: (projectForVoiceover?.settings as any)?.autoGenerate?.startedAt || new Date().toISOString(),
      },
    });

    // Step 4: Generate voiceover with style-appropriate settings
    let voiceoverAsset = null;
    try {
      const voiceoverUrl = await generateVoiceover({
        text: script.content,
        voice: styleSettings.voice,
        speed: styleSettings.speed,
        emotion: styleSettings.emotion,
      });

      // Upload voiceover to Wasabi
      const voiceoverUploadResult = await uploadFromUrl(voiceoverUrl, {
        organizationId: project.organizationId,
        projectId,
        assetType: 'audio',
        metadata: {
          type: 'voiceover',
          scriptId: script.id,
        },
      });

      // Save voiceover to database immediately
      voiceoverAsset = await createMediaAsset({
        projectId,
        type: 'voiceover',
        url: voiceoverUploadResult.url,
        metadata: {
          voice: styleSettings.voice,
          speed: styleSettings.speed,
          emotion: styleSettings.emotion,
          scriptId: script.id,
        },
      });

      console.log(`[${projectId}] Voiceover generated and saved`);
    } catch (error) {
      console.error(`[${projectId}] Error generating voiceover:`, error);
      // Continue even if voiceover fails - images are already saved
    }

    console.log(`[${projectId}] Updating project step to compile...`);

    // Update progress as completed (get latest project)
    const finalProject = await getProject(projectId);
    await updateProjectSettings(projectId, {
      ...(finalProject?.settings || {}),
      autoGenerate: {
        status: voiceoverAsset ? 'completed' : 'partial',
        step: 'complete',
        totalScenes: scenes.length,
        completedImages: imageResults.length,
        hasVoiceover: !!voiceoverAsset,
        completedAt: new Date().toISOString(),
      },
    });

    // Step 5: Update project step to compile (even if some steps failed)
    await updateProjectStep(projectId, 'compile');

    return NextResponse.json(
      {
        success: true,
        script: { id: script.id, content: script.content },
        scenes: scenes.length,
        images: imageResults.length,
        voiceover: voiceoverAsset ? { url: voiceoverAsset.url } : null,
        partial: imageResults.length < scenes.length || !voiceoverAsset, // Indicate if partial completion
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in auto-generate:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to auto-generate video' },
      { status: 500 }
    );
  }
}
