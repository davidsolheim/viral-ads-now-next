import { fal } from '@fal-ai/client';

// Configure fal.ai client
if (process.env.FAL_API_KEY) {
  fal.config({
    credentials: process.env.FAL_API_KEY,
  });
}

export interface FalVideoGenerationOptions {
  imageUrl: string;
  prompt?: string;
  duration?: '5' | '10'; // Kling 2.6 supports 5 or 10 seconds
  generateAudio?: boolean; // Set to false to save costs (7¢ vs 10¢ per second)
}

/**
 * Generate a video clip using Kling 2.6 through fal.ai
 * Pricing: 7¢ per second with audio disabled, 10¢ per second with audio enabled
 */
export async function generateKlingVideoFal(options: FalVideoGenerationOptions): Promise<string> {
  const { imageUrl, prompt = '', duration = '5', generateAudio = false } = options;

  if (!process.env.FAL_API_KEY) {
    throw new Error('FAL_API_KEY is not configured');
  }

  try {
    const result = await fal.subscribe('fal-ai/kling-video/v2.6/pro/image-to-video', {
      input: {
        prompt,
        image_url: imageUrl,
        duration,
        generate_audio: generateAudio, // Set to false to save 3¢ per second
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === 'IN_PROGRESS') {
          console.log(`[fal.ai] Kling 2.6 progress: ${update.logs?.map(log => log.message).join(', ') || 'Processing...'}`);
        }
      },
    });

    if (!result.data?.video?.url) {
      throw new Error('No video URL returned from fal.ai Kling 2.6');
    }

    console.log(`[fal.ai] Kling 2.6 video generated successfully: ${result.data.video.url}`);
    return result.data.video.url;
  } catch (error) {
    console.error('[fal.ai] Kling 2.6 video generation failed:', error);
    throw new Error(`fal.ai Kling 2.6 video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}