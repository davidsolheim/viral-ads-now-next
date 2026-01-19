/**
 * Replicate Service
 * Handles voiceover generation using Replicate's MiniMax TTS model
 */

export interface VoiceoverOptions {
  text: string;
  voice?: 'male-1' | 'male-2' | 'female-1' | 'female-2' | 'female-3';
  speed?: number; // 0.5 to 2.0
  pitch?: number; // -12 to 12
  volume?: number; // 0 to 100
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
}

interface ReplicateResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
}

export async function generateVoiceover(options: VoiceoverOptions): Promise<string> {
  const {
    text,
    voice = 'female-1',
    speed = 1.0,
    pitch = 0,
    volume = 80,
    emotion = 'neutral',
  } = options;

  if (!process.env.IMAGE_AI_API_KEY) {
    throw new Error('IMAGE_AI_API_KEY is not configured');
  }

  try {
    // Start the prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
      },
      body: JSON.stringify({
        version: 'minimax/text-to-speech:latest', // Update with actual version
        input: {
          text,
          voice,
          speed,
          pitch,
          volume: volume / 100,
          emotion,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.detail || response.statusText;
      
      // Provide helpful error message if version doesn't exist
      if (errorMessage.includes('version does not exist') || errorMessage.includes('permission')) {
        throw new Error(
          `Replicate model version not found. Please set REPLICATE_IMAGE_MODEL_VERSION in your .env.local file.\n` +
          `To find the correct version:\n` +
          `1. Visit https://replicate.com/stability-ai/stable-diffusion-xl-base-1.0\n` +
          `2. Or run: curl -H "Authorization: Token YOUR_TOKEN" https://api.replicate.com/v1/models/stability-ai/stable-diffusion-xl-base-1.0/versions\n` +
          `3. Copy the version ID and set it as REPLICATE_IMAGE_MODEL_VERSION in .env.local\n` +
          `Original error: ${errorMessage}`
        );
      }
      
      throw new Error(`Replicate API error: ${errorMessage}`);
    }

    let prediction: ReplicateResponse = await response.json();

    // Poll for completion
    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
        },
      });

      if (!pollResponse.ok) {
        throw new Error('Failed to poll prediction status');
      }

      prediction = await pollResponse.json();
    }

    if (prediction.status === 'failed') {
      throw new Error(`Voiceover generation failed: ${prediction.error}`);
    }

    if (prediction.status === 'canceled') {
      throw new Error('Voiceover generation was canceled');
    }

    const audioUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    if (!audioUrl) {
      throw new Error('No audio URL returned from Replicate');
    }

    return audioUrl;
  } catch (error) {
    console.error('Error generating voiceover:', error);
    throw error;
  }
}

export interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  style?: 'photorealistic' | 'artistic' | 'cinematic' | 'product';
}

export async function generateImage(options: ImageGenerationOptions): Promise<string> {
  const {
    prompt,
    width = 1024,
    height = 1024,
    style = 'photorealistic',
  } = options;

  if (!process.env.IMAGE_AI_API_KEY) {
    throw new Error('IMAGE_AI_API_KEY is not configured');
  }

  // Enhance prompt based on style
  const stylePrompts = {
    photorealistic: 'photorealistic, high quality, detailed, professional photography',
    artistic: 'artistic, creative, stylized, visually striking',
    cinematic: 'cinematic lighting, dramatic, film-like, high production value',
    product: 'product photography, clean background, professional lighting, commercial',
  };

  const enhancedPrompt = `${prompt}, ${stylePrompts[style]}`;

  // Get model version from env or use default
  // To find your model version: https://replicate.com/stability-ai/stable-diffusion-xl-base-1.0
  // Or use: curl -H "Authorization: Token YOUR_TOKEN" https://api.replicate.com/v1/models/stability-ai/stable-diffusion-xl-base-1.0/versions
  const modelVersion = process.env.REPLICATE_IMAGE_MODEL_VERSION || '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c1565e08b';

  try {
    // Start the prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
      },
      body: JSON.stringify({
        version: modelVersion,
        input: {
          prompt: enhancedPrompt,
          width,
          height,
          num_outputs: 1,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.detail || response.statusText;
      
      // Provide helpful error message if version doesn't exist
      if (errorMessage.includes('version does not exist') || errorMessage.includes('permission')) {
        throw new Error(
          `Replicate model version not found. Please set REPLICATE_IMAGE_MODEL_VERSION in your .env.local file.\n` +
          `To find the correct version:\n` +
          `1. Visit https://replicate.com/stability-ai/stable-diffusion-xl-base-1.0\n` +
          `2. Or run: curl -H "Authorization: Token YOUR_TOKEN" https://api.replicate.com/v1/models/stability-ai/stable-diffusion-xl-base-1.0/versions\n` +
          `3. Copy the version ID and set it as REPLICATE_IMAGE_MODEL_VERSION in .env.local\n` +
          `Original error: ${errorMessage}`
        );
      }
      
      throw new Error(`Replicate API error: ${errorMessage}`);
    }

    let prediction: ReplicateResponse = await response.json();

    // Poll for completion
    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
        },
      });

      if (!pollResponse.ok) {
        throw new Error('Failed to poll prediction status');
      }

      prediction = await pollResponse.json();
    }

    if (prediction.status === 'failed') {
      throw new Error(`Image generation failed: ${prediction.error}`);
    }

    if (prediction.status === 'canceled') {
      throw new Error('Image generation was canceled');
    }

    const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;

    if (!imageUrl) {
      throw new Error('No image URL returned from Replicate');
    }

    return imageUrl;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

/**
 * Generate multiple image candidates for selection
 */
export async function generateImageCandidates(
  options: ImageGenerationOptions,
  count: number = 2
): Promise<string[]> {
  const {
    prompt,
    width = 1024,
    height = 1024,
    style = 'photorealistic',
  } = options;

  if (!process.env.IMAGE_AI_API_KEY) {
    throw new Error('IMAGE_AI_API_KEY is not configured');
  }

  // Enhance prompt based on style
  const stylePrompts = {
    photorealistic: 'photorealistic, high quality, detailed, professional photography',
    artistic: 'artistic, creative, stylized, visually striking',
    cinematic: 'cinematic lighting, dramatic, film-like, high production value',
    product: 'product photography, clean background, professional lighting, commercial',
  };

  const enhancedPrompt = `${prompt}, ${stylePrompts[style]}`;

  // Get model version from env or use default
  // To find your model version: https://replicate.com/stability-ai/stable-diffusion-xl-base-1.0
  // Or use: curl -H "Authorization: Token YOUR_TOKEN" https://api.replicate.com/v1/models/stability-ai/stable-diffusion-xl-base-1.0/versions
  const modelVersion = process.env.REPLICATE_IMAGE_MODEL_VERSION || '39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c1565e08b';

  try {
    // Start the prediction with multiple outputs
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
      },
      body: JSON.stringify({
        version: modelVersion,
        input: {
          prompt: enhancedPrompt,
          width,
          height,
          num_outputs: count,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.detail || response.statusText;
      
      // Provide helpful error message if version doesn't exist
      if (errorMessage.includes('version does not exist') || errorMessage.includes('permission')) {
        throw new Error(
          `Replicate model version not found. Please set REPLICATE_IMAGE_MODEL_VERSION in your .env.local file.\n` +
          `To find the correct version:\n` +
          `1. Visit https://replicate.com/stability-ai/stable-diffusion-xl-base-1.0\n` +
          `2. Or run: curl -H "Authorization: Token YOUR_TOKEN" https://api.replicate.com/v1/models/stability-ai/stable-diffusion-xl-base-1.0/versions\n` +
          `3. Copy the version ID and set it as REPLICATE_IMAGE_MODEL_VERSION in .env.local\n` +
          `Original error: ${errorMessage}`
        );
      }
      
      throw new Error(`Replicate API error: ${errorMessage}`);
    }

    let prediction: ReplicateResponse = await response.json();

    // Poll for completion
    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
        },
      });

      if (!pollResponse.ok) {
        throw new Error('Failed to poll prediction status');
      }

      prediction = await pollResponse.json();
    }

    if (prediction.status === 'failed') {
      throw new Error(`Image generation failed: ${prediction.error}`);
    }

    if (prediction.status === 'canceled') {
      throw new Error('Image generation was canceled');
    }

    // Handle array or single output
    let imageUrls: string[];
    if (Array.isArray(prediction.output)) {
      imageUrls = prediction.output.filter((url): url is string => typeof url === 'string');
    } else if (prediction.output) {
      imageUrls = [prediction.output];
    } else {
      throw new Error('No image URLs returned from Replicate');
    }

    // Ensure we have the requested number of images
    if (imageUrls.length < count) {
      console.warn(`Requested ${count} images but only got ${imageUrls.length}`);
    }

    return imageUrls.slice(0, count);
  } catch (error) {
    console.error('Error generating image candidates:', error);
    throw error;
  }
}

export interface VideoGenerationOptions {
  imageUrl: string;
  prompt?: string;
  model?: string;
}

/**
 * Generate an animated video clip from an image
 */
export async function animateVideo(options: VideoGenerationOptions): Promise<string> {
  const { imageUrl, prompt = '', model } = options;

  if (!process.env.IMAGE_AI_API_KEY) {
    throw new Error('IMAGE_AI_API_KEY is not configured');
  }

  const modelVersion = process.env.REPLICATE_VIDEO_MODEL_VERSION;
  if (!modelVersion) {
    throw new Error('REPLICATE_VIDEO_MODEL_VERSION is not configured');
  }

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        image: imageUrl,
        prompt,
        model,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Replicate API error: ${error.detail || response.statusText}`);
  }

  let prediction: ReplicateResponse = await response.json();
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
      },
    });
    if (!pollResponse.ok) {
      throw new Error('Failed to poll prediction status');
    }
    prediction = await pollResponse.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(`Video generation failed: ${prediction.error}`);
  }

  const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!videoUrl) {
    throw new Error('No video URL returned from Replicate');
  }
  return videoUrl;
}

/**
 * Generate a video clip using Kling model
 */
export async function generateKlingVideo(options: VideoGenerationOptions): Promise<string> {
  const { imageUrl, prompt = '', model } = options;

  if (!process.env.IMAGE_AI_API_KEY) {
    throw new Error('IMAGE_AI_API_KEY is not configured');
  }

  const modelVersion = process.env.KLING_VIDEO_MODEL_VERSION;
  if (!modelVersion) {
    throw new Error('KLING_VIDEO_MODEL_VERSION is not configured');
  }

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        image: imageUrl,
        prompt,
        model,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Replicate API error: ${error.detail || response.statusText}`);
  }

  let prediction: ReplicateResponse = await response.json();
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
      },
    });
    if (!pollResponse.ok) {
      throw new Error('Failed to poll prediction status');
    }
    prediction = await pollResponse.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(`Kling video generation failed: ${prediction.error}`);
  }

  const videoUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!videoUrl) {
    throw new Error('No video URL returned from Kling');
  }
  return videoUrl;
}

export interface MusicGenerationOptions {
  prompt: string;
  durationSeconds?: number;
}

export async function generateMusicLyra(options: MusicGenerationOptions): Promise<string> {
  const { prompt, durationSeconds = 30 } = options;

  if (!process.env.IMAGE_AI_API_KEY) {
    throw new Error('IMAGE_AI_API_KEY is not configured');
  }

  const modelVersion = process.env.REPLICATE_MUSIC_LYRA_VERSION;
  if (!modelVersion) {
    throw new Error('REPLICATE_MUSIC_LYRA_VERSION is not configured');
  }

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        prompt,
        duration: durationSeconds,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Replicate API error: ${error.detail || response.statusText}`);
  }

  let prediction: ReplicateResponse = await response.json();
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
      },
    });
    if (!pollResponse.ok) {
      throw new Error('Failed to poll prediction status');
    }
    prediction = await pollResponse.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(`Music generation failed: ${prediction.error}`);
  }

  const audioUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!audioUrl) {
    throw new Error('No audio URL returned from Replicate');
  }
  return audioUrl;
}

export async function generateMusicStableAudio(options: MusicGenerationOptions): Promise<string> {
  const { prompt, durationSeconds = 90 } = options;

  if (!process.env.IMAGE_AI_API_KEY) {
    throw new Error('IMAGE_AI_API_KEY is not configured');
  }

  const modelVersion = process.env.REPLICATE_MUSIC_STABLE_AUDIO_VERSION;
  if (!modelVersion) {
    throw new Error('REPLICATE_MUSIC_STABLE_AUDIO_VERSION is not configured');
  }

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      version: modelVersion,
      input: {
        prompt,
        duration: durationSeconds,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Replicate API error: ${error.detail || response.statusText}`);
  }

  let prediction: ReplicateResponse = await response.json();
  while (prediction.status === 'starting' || prediction.status === 'processing') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: {
        'Authorization': `Token ${process.env.IMAGE_AI_API_KEY}`,
      },
    });
    if (!pollResponse.ok) {
      throw new Error('Failed to poll prediction status');
    }
    prediction = await pollResponse.json();
  }

  if (prediction.status === 'failed') {
    throw new Error(`Stable Audio generation failed: ${prediction.error}`);
  }

  const audioUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!audioUrl) {
    throw new Error('No audio URL returned from Stable Audio');
  }
  return audioUrl;
}
