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

interface ExtractedProduct {
  name: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  currency?: string;
  features?: string[];
  benefits?: string[];
  images?: string[];
}

export async function extractProductFromUrl(
  content: string,
  url: string
): Promise<ExtractedProduct> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const prompt = `Extract product data from the following webpage content. Return only valid JSON with this structure:
{
  "name": "string (REQUIRED - product name or title)",
  "description": "string",
  "price": "string",
  "originalPrice": "string",
  "currency": "string",
  "features": ["string"],
  "benefits": ["string"],
  "images": ["string"]
}

Guidelines:
- The "name" field is REQUIRED and must always be present. Extract the product name or title from the content or URL.
- The "features" field is REQUIRED and must contain 3-8 features. If features are not explicitly listed on the page, infer them from the product description, specifications, or characteristics.
- The "benefits" field is REQUIRED and must contain 3-8 benefits. If benefits are not explicitly listed, generate them based on what customers would gain from using this product. Focus on emotional and practical benefits that would be compelling for ad copy.
- Use the product page content and URL as context.
- Prefer concise, human-readable values.
- "images" should include absolute URLs if available.
- If the product name is unclear, use the page title or a reasonable name derived from the URL.
- For features: Think about what makes this product stand out - materials, technology, design, functionality, quality, etc.
- For benefits: Think about what problems this solves for customers - convenience, savings, quality of life, performance, status, etc.

URL: ${url}

Content:
${content}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Updated to support JSON mode
        messages: [
          {
            role: 'system',
            content:
              'You extract structured product data from webpage content and generate marketing-focused features and benefits. Always include at least 3 features and 3 benefits in your response, even if they are not explicitly listed on the page. Generate them based on the product description and characteristics. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const contentJson = data.choices[0]?.message?.content;

    if (!contentJson) {
      throw new Error('No product data generated from OpenAI');
    }

    let parsed: ExtractedProduct;
    try {
      parsed = JSON.parse(contentJson);
    } catch (parseError) {
      console.error('Failed to parse OpenAI JSON response:', contentJson);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Ensure name is present - extract from URL as fallback if missing
    if (!parsed.name || parsed.name.trim() === '') {
      console.warn('OpenAI response missing name field:', parsed);
      // Try to extract name from URL as fallback
      const urlParts = url.split('/').filter(Boolean);
      const fallbackName = urlParts[urlParts.length - 1]
        ?.replace(/[-_]/g, ' ')
        ?.replace(/\.(html|htm|php|aspx)/i, '')
        || 'Product';
      parsed.name = fallbackName;
    }

    // Ensure features and benefits are present - generate fallbacks if missing
    if (!parsed.features || parsed.features.length === 0) {
      console.warn('OpenAI response missing features, generating fallbacks');
      parsed.features = [
        'High quality materials',
        'Modern design',
        'Customer tested',
        'Great value',
      ];
    }
    
    if (!parsed.benefits || parsed.benefits.length === 0) {
      console.warn('OpenAI response missing benefits, generating fallbacks');
      parsed.benefits = [
        'Improves daily life',
        'Saves time and effort',
        'Great value for money',
        'Reliable and trustworthy',
      ];
    }

    return parsed;
  } catch (error) {
    console.error('Error extracting product data:', error);
    throw error;
  }
}

export type AdStyle = 'conversational' | 'energetic' | 'professional' | 'casual' | 'sex_appeal';

export interface StyleSettings {
  voice: 'male-1' | 'male-2' | 'female-1' | 'female-2' | 'female-3';
  emotion: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
  imageStyle: 'photorealistic' | 'artistic' | 'cinematic' | 'product';
  speed: number;
  pitch?: number;
}

export function getStyleSettings(style: AdStyle): StyleSettings {
  const settings: Record<AdStyle, StyleSettings> = {
    conversational: {
      voice: 'female-1',
      emotion: 'neutral',
      imageStyle: 'photorealistic',
      speed: 1.0,
    },
    energetic: {
      voice: 'female-2',
      emotion: 'happy',
      imageStyle: 'cinematic',
      speed: 1.1,
    },
    professional: {
      voice: 'male-1',
      emotion: 'neutral',
      imageStyle: 'photorealistic',
      speed: 1.0,
    },
    casual: {
      voice: 'female-1',
      emotion: 'happy',
      imageStyle: 'artistic',
      speed: 1.0,
    },
    sex_appeal: {
      voice: 'female-1',
      emotion: 'happy',
      imageStyle: 'cinematic',
      speed: 1.0,
    },
  };

  return settings[style];
}

interface ScriptGenerationOptions {
  product: ProductData;
  style?: AdStyle;
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
        model: 'gpt-4o', // Updated for consistency
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

Return the response as a JSON object with a "scenes" key containing an array with this structure:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "scriptText": "portion of script",
      "visualDescription": "detailed visual description",
      "estimatedDuration": 5
    }
  ]
}

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
        model: 'gpt-4o', // Updated to support JSON mode
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
    
    // Handle both { scenes: [...] } and direct array format
    let scenes = parsed.scenes;
    if (!scenes && Array.isArray(parsed)) {
      scenes = parsed;
    }

    if (!Array.isArray(scenes)) {
      console.error('Invalid scene breakdown format. Received:', parsed);
      throw new Error('Invalid scene breakdown format. Expected array of scenes.');
    }

    // Ensure all scenes have required fields
    return scenes.map((scene: any, index: number) => ({
      sceneNumber: scene.sceneNumber ?? index + 1,
      scriptText: scene.scriptText ?? '',
      visualDescription: scene.visualDescription ?? '',
      estimatedDuration: scene.estimatedDuration ?? 5,
    }));
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
        model: 'gpt-4o', // Updated to support JSON mode
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

/**
 * Generate multiple script candidates with slight variations
 */
export async function generateScriptCandidates(
  options: ScriptGenerationOptions,
  count: number = 2
): Promise<string[]> {
  const candidates: string[] = [];
  
  // Generate candidates with slight temperature variations
  for (let i = 0; i < count; i++) {
    const temperature = 0.7 + (i * 0.2); // Vary between 0.7 and 0.9
    const script = await generateScriptWithTemperature(options, temperature);
    candidates.push(script);
  }
  
  return candidates;
}

/**
 * Generate script with specific temperature for variation
 */
async function generateScriptWithTemperature(
  options: ScriptGenerationOptions,
  temperature: number
): Promise<string> {
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
        model: 'gpt-4o',
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
        temperature,
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

/**
 * Select the best script from candidates using LLM evaluation
 */
export async function selectBestScript(
  candidates: string[],
  product: ProductData,
  style: AdStyle
): Promise<number> {
  if (candidates.length === 0) {
    throw new Error('No candidates provided');
  }
  if (candidates.length === 1) {
    return 0;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const candidatesText = candidates
    .map((c, i) => `Candidate ${i + 1}:\n${c}`)
    .join('\n\n---\n\n');

  const prompt = `Evaluate these ${candidates.length} TikTok ad script candidates for a product and select the best one.

Product: ${product.name}
${product.description ? `Description: ${product.description}` : ''}
Style: ${style}

Candidates:
${candidatesText}

Evaluate each script on:
1. Hook quality (does it grab attention in first 2 seconds?)
2. Style match (does it match the ${style} tone?)
3. Conversion potential (clear CTA, urgency, benefit focus)
4. Natural flow and authenticity

Return ONLY a JSON object with this structure:
{
  "bestCandidateIndex": 0,
  "reason": "brief explanation"
}

The index should be 0-based (0 for first candidate, 1 for second, etc.)`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Use cheaper model for selection
        messages: [
          {
            role: 'system',
            content: 'You are an expert ad evaluator. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
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
      throw new Error('No selection result from OpenAI');
    }

    const result = JSON.parse(content);
    const index = result.bestCandidateIndex;

    if (typeof index !== 'number' || index < 0 || index >= candidates.length) {
      console.warn('Invalid candidate index, defaulting to 0');
      return 0;
    }

    return index;
  } catch (error) {
    console.error('Error selecting best script:', error);
    // Fallback to first candidate on error
    return 0;
  }
}

/**
 * Select the best image from candidates using LLM evaluation
 */
export async function selectBestImage(
  candidates: Array<{ url: string; prompt: string }>,
  sceneDescription: string,
  style: AdStyle
): Promise<number> {
  if (candidates.length === 0) {
    throw new Error('No candidates provided');
  }
  if (candidates.length === 1) {
    return 0;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const candidatesText = candidates
    .map((c, i) => `Candidate ${i + 1}:\nPrompt: ${c.prompt}\nURL: ${c.url}`)
    .join('\n\n---\n\n');

  const prompt = `Evaluate these ${candidates.length} image candidates for a video scene and select the best one.

Scene Description: ${sceneDescription}
Ad Style: ${style}

Candidates:
${candidatesText}

Evaluate each image on:
1. Visual quality and composition
2. Relevance to scene description
3. Style match (${style} aesthetic)
4. Appeal and engagement potential

Return ONLY a JSON object with this structure:
{
  "bestCandidateIndex": 0,
  "reason": "brief explanation"
}

The index should be 0-based (0 for first candidate, 1 for second, etc.)`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Use cheaper model for selection
        messages: [
          {
            role: 'system',
            content: 'You are an expert visual evaluator. Return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
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
      throw new Error('No selection result from OpenAI');
    }

    const result = JSON.parse(content);
    const index = result.bestCandidateIndex;

    if (typeof index !== 'number' || index < 0 || index >= candidates.length) {
      console.warn('Invalid candidate index, defaulting to 0');
      return 0;
    }

    return index;
  } catch (error) {
    console.error('Error selecting best image:', error);
    // Fallback to first candidate on error
    return 0;
  }
}
