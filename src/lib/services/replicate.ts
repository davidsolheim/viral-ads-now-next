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

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not configured');
  }

  try {
    // Start the prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
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
      throw new Error(`Replicate API error: ${error.detail || response.statusText}`);
    }

    let prediction: ReplicateResponse = await response.json();

    // Poll for completion
    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
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

  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error('REPLICATE_API_TOKEN is not configured');
  }

  // Enhance prompt based on style
  const stylePrompts = {
    photorealistic: 'photorealistic, high quality, detailed, professional photography',
    artistic: 'artistic, creative, stylized, visually striking',
    cinematic: 'cinematic lighting, dramatic, film-like, high production value',
    product: 'product photography, clean background, professional lighting, commercial',
  };

  const enhancedPrompt = `${prompt}, ${stylePrompts[style]}`;

  try {
    // Start the prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        version: 'stability-ai/sdxl:latest', // Update with actual version
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
      throw new Error(`Replicate API error: ${error.detail || response.statusText}`);
    }

    let prediction: ReplicateResponse = await response.json();

    // Poll for completion
    while (prediction.status === 'starting' || prediction.status === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
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
