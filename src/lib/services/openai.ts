/**
 * OpenAI Service
 * Handles script generation using OpenAI's GPT models
 */

interface ProductData {
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  features?: string[];
  benefits?: string[];
}

interface ScriptGenerationOptions {
  product: ProductData;
  style?: 'conversational' | 'energetic' | 'professional' | 'casual';
  duration?: number; // Target duration in seconds
  platform?: 'tiktok' | 'instagram' | 'youtube';
}

export async function generateScript(options: ScriptGenerationOptions): Promise<string> {
  const { product, style = 'conversational', duration = 30, platform = 'tiktok' } = options;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const prompt = `You are an expert TikTok ad copywriter. Create a ${duration}-second video ad script for the following product.

Product Name: ${product.name}
${product.description ? `Description: ${product.description}` : ''}
${product.price ? `Price: ${product.price}` : ''}
${product.originalPrice ? `Original Price: ${product.originalPrice}` : ''}
${product.features && product.features.length > 0 ? `Features:\n${product.features.map(f => `- ${f}`).join('\n')}` : ''}
${product.benefits && product.benefits.length > 0 ? `Benefits:\n${product.benefits.map(b => `- ${b}`).join('\n')}` : ''}

Style: ${style}
Platform: ${platform}
Duration: ${duration} seconds

Requirements:
1. Write in a natural, ${style} tone that sounds authentic
2. Hook viewers in the first 2 seconds
3. Highlight the main benefit and create urgency
4. Include a clear call-to-action
5. Keep it concise - aim for ${Math.floor(duration * 2.5)} to ${Math.floor(duration * 3)} words total
6. Use short, punchy sentences
7. Don't use hashtags or emojis in the script itself
8. Write only the spoken words, no stage directions or descriptions

Script:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert ad copywriter specializing in short-form video content for social media platforms.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const script = data.choices[0]?.message?.content?.trim();

    if (!script) {
      throw new Error('No script generated from OpenAI');
    }

    return script;
  } catch (error) {
    console.error('Error generating script:', error);
    throw error;
  }
}

interface SceneBreakdownOptions {
  script: string;
  targetScenes?: number;
}

interface Scene {
  sceneNumber: number;
  scriptText: string;
  visualDescription: string;
  estimatedDuration: number;
}

export async function breakdownIntoScenes(options: SceneBreakdownOptions): Promise<Scene[]> {
  const { script, targetScenes = 4 } = options;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const prompt = `Break down the following video ad script into ${targetScenes} visual scenes. For each scene, provide:
1. The portion of the script text
2. A detailed visual description for image generation
3. Estimated duration in seconds

Script:
${script}

Return the response as a JSON array with this structure:
[
  {
    "sceneNumber": 1,
    "scriptText": "portion of script",
    "visualDescription": "detailed visual description",
    "estimatedDuration": 5
  }
]

Make sure:
- Visual descriptions are detailed and specific for AI image generation
- Descriptions include style, composition, lighting, and mood
- Total duration adds up to approximately 30 seconds
- Each scene has a clear visual focus`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert video director and visual storyteller. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No scene breakdown generated from OpenAI');
    }

    const parsed = JSON.parse(content);
    const scenes = parsed.scenes || parsed;

    if (!Array.isArray(scenes)) {
      throw new Error('Invalid scene breakdown format');
    }

    return scenes;
  } catch (error) {
    console.error('Error breaking down scenes:', error);
    throw error;
  }
}

interface TikTokMetadataOptions {
  productName: string;
  script: string;
}

interface TikTokMetadata {
  title: string;
  description: string;
  hashtags: string[];
}

export async function generateTikTokMetadata(options: TikTokMetadataOptions): Promise<TikTokMetadata> {
  const { productName, script } = options;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const prompt = `Generate TikTok post metadata for this video ad:

Product: ${productName}
Script: ${script}

Generate:
1. A catchy title (max 100 characters)
2. An engaging description (max 150 characters)
3. 5-8 relevant hashtags

Return as JSON:
{
  "title": "catchy title",
  "description": "engaging description",
  "hashtags": ["hashtag1", "hashtag2", ...]
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a TikTok marketing expert. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No metadata generated from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    console.error('Error generating TikTok metadata:', error);
    throw error;
  }
}
