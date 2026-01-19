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
  getMusicTracksByOrganization,
  updateProjectStatus,
} from '@/lib/db-queries';
import {
  generateScriptCandidates,
  selectBestScript,
  selectBestImage,
  breakdownIntoScenes,
  getStyleSettings,
  generateTikTokMetadata,
  type AdStyle,
} from '@/lib/services/openai';
import {
  generateImageCandidates,
  generateVoiceover,
  animateVideo,
  generateKlingVideo,
  generateMusicLyra,
} from '@/lib/services/replicate';
import { uploadFromUrl } from '@/lib/services/wasabi';
import { z } from 'zod';

const autoGenerateSchema = z.object({
  style: z.enum(['conversational', 'energetic', 'professional', 'casual', 'sex_appeal']).optional(),
});

async function updateAutoProgress(
  projectId: string,
  step: string,
  data: Record<string, any> = {}
) {
  const latestProject = await getProject(projectId);
  const settings = (latestProject?.settings as any) || {};
  const currentAuto = settings.autoGenerate || {};
  const autoGenerate = {
    ...currentAuto,
    ...data,
    step,
    status: data.status || currentAuto.status || 'in_progress',
    updatedAt: new Date().toISOString(),
  };
  await updateProjectSettings(projectId, { ...settings, autoGenerate });
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
    const { style } = autoGenerateSchema.parse(body);

    // Get project settings for duration and aspect ratio
    const settings = (project.settings as any) || {};
    const duration = settings.duration || 30;
    const aspectRatio = settings.aspectRatio || 'portrait';

    await updateAutoProgress(projectId, 'script', {
      message: 'Generating script...',
      startedAt: new Date().toISOString(),
    });

    // Check if concept already exists (selected script + scenes)
    const selectedScript = await getSelectedScriptByProject(projectId);
    let script: any;
    let scenes: any[];

    if (selectedScript) {
      // Use existing concept
      console.log(`[${projectId}] Using existing concept (script ${selectedScript.id})...`);
      script = selectedScript;
      await updateAutoProgress(projectId, 'script', {
        message: 'Using existing script.',
        selectedScriptId: script.id,
      });
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

      console.log(`[${projectId}] No concept found. Generating script and scenes...`);
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

    await updateProjectStep(projectId, 'script');
    await updateAutoProgress(projectId, 'script', {
      message: 'Script selected.',
      selectedScriptId: script?.id,
    });

    await updateProjectStep(projectId, 'scenes');
    await updateAutoProgress(projectId, 'scenes', {
      message: `Scenes generated (${scenes.length}).`,
      totalScenes: scenes.length,
    });

    // Get style settings
    const styleSettings = getStyleSettings((style || project.adStyle || 'conversational') as AdStyle);

    console.log(`[${projectId}] Using ${scenes.length} scenes. Generating final images...`);

    await updateProjectStep(projectId, 'images');
    await updateAutoProgress(projectId, 'images', {
      message: 'Generating images...',
      totalScenes: scenes.length,
      completedImages: 0,
      startedAt: new Date().toISOString(),
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
            isPreview: 'false', // Mark as final image
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
        
        await updateAutoProgress(projectId, 'images', {
          message: `Generated ${imageResults.length}/${scenes.length} images.`,
          totalScenes: scenes.length,
          completedImages: imageResults.length,
        });
        
        console.log(`[${projectId}] Scene ${scene.sceneNumber} final image saved`);
      } catch (error) {
        console.error(`[${projectId}] Error generating image for scene ${scene.sceneNumber}:`, error);
        // Continue with other scenes even if one fails
        // Previous images are already saved
      }
    }

    console.log(`[${projectId}] ${imageResults.length}/${scenes.length} images generated. Creating videos...`);

    await updateProjectStep(projectId, 'video');
    await updateAutoProgress(projectId, 'video', {
      message: 'Generating video clips...',
      totalScenes: scenes.length,
      completedImages: imageResults.length,
      completedVideos: 0,
    });

    const videoResults: any[] = [];
    const videoModel = settings.video_model || 'kling-v2-5';
    for (const scene of scenes) {
      const sceneImage = imageResults.find((img) => img.sceneId === scene.id)?.asset;
      if (!sceneImage) {
        continue;
      }
      try {
        const prompt =
          (scene.metadata as any)?.videoPrompt || scene.visualDescription;
        const isKling = videoModel.includes('kling');
        const videoUrl = isKling
          ? await generateKlingVideo({ imageUrl: sceneImage.url, prompt, model: videoModel })
          : await animateVideo({ imageUrl: sceneImage.url, prompt, model: videoModel });

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
            model: videoModel,
            prompt,
          },
        });

        videoResults.push(asset);
        await updateAutoProgress(projectId, 'video', {
          message: `Generated ${videoResults.length}/${scenes.length} videos.`,
          totalScenes: scenes.length,
          completedVideos: videoResults.length,
        });
      } catch (error) {
        console.error(`[${projectId}] Error generating video for scene ${scene.sceneNumber}:`, error);
      }
    }

    console.log(`[${projectId}] Videos generated. Creating voiceover...`);

    await updateProjectStep(projectId, 'voiceover');
    await updateAutoProgress(projectId, 'voiceover', {
      message: 'Generating voiceover...',
      totalScenes: scenes.length,
      completedImages: imageResults.length,
    });

    let voiceoverAsset = null;
    try {
      const voiceoverUrl = await generateVoiceover({
        text: script.content,
        voice: styleSettings.voice,
        speed: styleSettings.speed,
        emotion: styleSettings.emotion,
      });

      const voiceoverUploadResult = await uploadFromUrl(voiceoverUrl, {
        organizationId: project.organizationId,
        projectId,
        assetType: 'audio',
        metadata: {
          type: 'voiceover',
          scriptId: script.id,
        },
      });

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
      await updateAutoProgress(projectId, 'voiceover', {
        message: 'Voiceover generated.',
        hasVoiceover: true,
      });
    } catch (error) {
      console.error(`[${projectId}] Error generating voiceover:`, error);
    }

    await updateProjectStep(projectId, 'music');
    await updateAutoProgress(projectId, 'music', { message: 'Selecting music...' });

    let musicAsset: any = null;
    try {
      const tracks = await getMusicTracksByOrganization(project.organizationId);
      let musicUrl: string | null = null;
      let metadata: any = {};
      if (tracks.length > 0) {
        const track = tracks[0];
        musicUrl = track.url;
        metadata = { source: 'preset', trackId: track.id, name: track.name };
      } else {
        const prompt = `Upbeat background music for ${product.name}`;
        const durationSeconds = settings.duration || 30;
        musicUrl = await generateMusicLyra({ prompt, durationSeconds });
        metadata = { source: 'generated', model: 'lyra-2', prompt, duration: durationSeconds };
      }

      if (musicUrl) {
        const uploadResult = await uploadFromUrl(musicUrl, {
          organizationId: project.organizationId,
          projectId,
          assetType: 'audio',
          metadata: { source: metadata.source || 'music' },
        });
        musicAsset = await createMediaAsset({
          projectId,
          type: 'music',
          url: uploadResult.url,
          metadata,
        });
      }
    } catch (error) {
      console.error(`[${projectId}] Error selecting music:`, error);
    }

    await updateAutoProgress(projectId, 'music', {
      message: musicAsset ? 'Music selected.' : 'Music selection failed.',
    });

    await updateProjectStep(projectId, 'captions');
    await updateAutoProgress(projectId, 'captions', { message: 'Styling captions...' });

    const captionsDefaults = {
      enabled: true,
      fontFamily: 'Inter',
      fontSize: 48,
      fontColor: '#FFFFFF',
      position: 80,
      wordsPerLine: 0,
      style: {
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
      },
      effects: {
        outlineColor: '#000000',
        outlineWidth: 2,
        shadowColor: '#000000',
        shadowOffset: 4,
        glowColor: '#FFFFFF',
        glowSize: 0,
        highlightColor: '#FFD700',
      },
    };
    const latestForCaptions = await getProject(projectId);
    const latestCaptionsSettings = (latestForCaptions?.settings as any) || {};
    await updateProjectSettings(projectId, {
      ...latestCaptionsSettings,
      captions: latestCaptionsSettings.captions || captionsDefaults,
      captions_enabled: true,
      music_volume: latestCaptionsSettings.music_volume ?? 50,
    });

    await updateProjectStep(projectId, 'compile');
    await updateAutoProgress(projectId, 'compile', { message: 'Ready for preview export.' });

    await updateAutoProgress(projectId, 'tiktok', { message: 'Generating TikTok metadata...' });
    try {
      const generated = await generateTikTokMetadata({
        productName: product.name,
        script: script.content,
      });
      const tiktok_metadata = {
        description: generated.description,
        hashtags: generated.hashtags?.slice(0, 5) || [],
        keywords: [],
      };
      const latestProject = await getProject(projectId);
      const latestSettings = (latestProject?.settings as any) || {};
      await updateProjectSettings(projectId, { ...latestSettings, tiktok_metadata });
    } catch (error) {
      console.error(`[${projectId}] Error generating TikTok metadata:`, error);
    }

    await updateProjectStatus(projectId, 'completed');
    await updateProjectStep(projectId, 'complete');
    await updateAutoProgress(projectId, 'complete', {
      status: 'completed',
      message: 'Auto-generation complete.',
      totalScenes: scenes.length,
      completedImages: imageResults.length,
      completedVideos: videoResults.length,
      hasVoiceover: !!voiceoverAsset,
      completedAt: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        success: true,
        script: { id: script.id, content: script.content },
        scenes: scenes.length,
        images: imageResults.length,
        videos: videoResults.length,
        voiceover: voiceoverAsset ? { url: voiceoverAsset.url } : null,
        music: musicAsset ? { url: musicAsset.url } : null,
        partial:
          imageResults.length < scenes.length ||
          videoResults.length < scenes.length ||
          !voiceoverAsset ||
          !musicAsset,
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
