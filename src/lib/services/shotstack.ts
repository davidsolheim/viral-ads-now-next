/**
 * Shotstack Service
 * Handles video compilation and rendering
 */

export interface VideoClip {
  type: 'image' | 'video';
  url: string;
  duration: number;
  transition?: 'fade' | 'zoom' | 'slide';
}

export interface Caption {
  text: string;
  start: number;
  duration: number;
}

export interface VideoCompilationOptions {
  clips: VideoClip[];
  voiceoverUrl?: string;
  musicUrl?: string;
  musicVolume?: number; // 0 to 1
  captions?: Caption[];
  captionStyle?: {
    font?: string;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    position?: 'top' | 'center' | 'bottom';
  };
  resolution?: '480p' | '720p' | '1080p' | '4k';
  format?: 'mp4' | 'mov';
}

interface ShotstackResponse {
  success: boolean;
  message: string;
  response: {
    id: string;
    status: 'queued' | 'fetching' | 'rendering' | 'saving' | 'done' | 'failed';
    url?: string;
    error?: string;
  };
}

export async function compileVideo(options: VideoCompilationOptions): Promise<string> {
  const {
    clips,
    voiceoverUrl,
    musicUrl,
    musicVolume = 0.3,
    captions = [],
    captionStyle = {},
    resolution = '1080p',
    format = 'mp4',
  } = options;

  if (!process.env.SHOTSTACK_API_KEY) {
    throw new Error('SHOTSTACK_API_KEY is not configured');
  }

  // Map resolution to dimensions
  const resolutionMap = {
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
  };

  const dimensions = resolutionMap[resolution];

  // Build timeline
  const timeline: any = {
    tracks: [],
  };

  // Video/Image track
  const videoTrack = {
    clips: clips.map((clip, index) => {
      const startTime = clips.slice(0, index).reduce((sum, c) => sum + c.duration, 0);

      return {
        asset: {
          type: clip.type,
          src: clip.url,
        },
        start: startTime,
        length: clip.duration,
        fit: 'cover',
        scale: 1.0,
        transition: clip.transition ? {
          in: clip.transition,
          out: clip.transition,
        } : undefined,
      };
    }),
  };

  timeline.tracks.push(videoTrack);

  // Voiceover track
  if (voiceoverUrl) {
    timeline.tracks.push({
      clips: [
        {
          asset: {
            type: 'audio',
            src: voiceoverUrl,
          },
          start: 0,
          volume: 1.0,
        },
      ],
    });
  }

  // Music track
  if (musicUrl) {
    const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0);
    timeline.tracks.push({
      clips: [
        {
          asset: {
            type: 'audio',
            src: musicUrl,
          },
          start: 0,
          length: totalDuration,
          volume: musicVolume,
        },
      ],
    });
  }

  // Caption track
  if (captions.length > 0) {
    const captionClips = captions.map((caption) => ({
      asset: {
        type: 'title',
        text: caption.text,
        style: captionStyle.font || 'montserrat',
        size: captionStyle.fontSize || 'medium',
        color: captionStyle.color || '#ffffff',
        background: captionStyle.backgroundColor || 'rgba(0,0,0,0.5)',
        position: captionStyle.position || 'bottom',
      },
      start: caption.start,
      length: caption.duration,
    }));

    timeline.tracks.push({ clips: captionClips });
  }

  // Build the edit
  const edit = {
    timeline,
    output: {
      format,
      resolution: `${dimensions.width}x${dimensions.height}`,
    },
  };

  try {
    // Submit render
    const response = await fetch('https://api.shotstack.io/v1/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SHOTSTACK_API_KEY,
      },
      body: JSON.stringify(edit),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Shotstack API error: ${error.message || response.statusText}`);
    }

    const renderData: ShotstackResponse = await response.json();
    const renderId = renderData.response.id;

    // Poll for completion
    let status = renderData.response.status;
    let videoUrl: string | undefined;

    while (status !== 'done' && status !== 'failed') {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollResponse = await fetch(`https://api.shotstack.io/v1/render/${renderId}`, {
        headers: {
          'x-api-key': process.env.SHOTSTACK_API_KEY!,
        },
      });

      if (!pollResponse.ok) {
        throw new Error('Failed to poll render status');
      }

      const pollData: ShotstackResponse = await pollResponse.json();
      status = pollData.response.status;
      videoUrl = pollData.response.url;

      if (status === 'failed') {
        throw new Error(`Video compilation failed: ${pollData.response.error}`);
      }
    }

    if (!videoUrl) {
      throw new Error('No video URL returned from Shotstack');
    }

    return videoUrl;
  } catch (error) {
    console.error('Error compiling video:', error);
    throw error;
  }
}

export interface VideoToVideoOptions {
  imageUrl: string;
  duration: number;
  motion?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static';
}

export async function animateImage(options: VideoToVideoOptions): Promise<string> {
  const { imageUrl, duration, motion = 'zoom-in' } = options;

  if (!process.env.SHOTSTACK_API_KEY) {
    throw new Error('SHOTSTACK_API_KEY is not configured');
  }

  // Define motion effects
  const motionEffects: Record<string, any> = {
    'zoom-in': { scale: 1.2, scaleEffect: 'zoomIn' },
    'zoom-out': { scale: 0.8, scaleEffect: 'zoomOut' },
    'pan-left': { offset: { x: -0.1 }, },
    'pan-right': { offset: { x: 0.1 } },
    'static': {},
  };

  const effect = motionEffects[motion];

  const edit = {
    timeline: {
      tracks: [
        {
          clips: [
            {
              asset: {
                type: 'image',
                src: imageUrl,
              },
              start: 0,
              length: duration,
              fit: 'cover',
              ...effect,
            },
          ],
        },
      ],
    },
    output: {
      format: 'mp4',
      resolution: '1920x1080',
    },
  };

  try {
    const response = await fetch('https://api.shotstack.io/v1/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.SHOTSTACK_API_KEY,
      },
      body: JSON.stringify(edit),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Shotstack API error: ${error.message || response.statusText}`);
    }

    const renderData: ShotstackResponse = await response.json();
    const renderId = renderData.response.id;

    // Poll for completion
    let status = renderData.response.status;
    let videoUrl: string | undefined;

    while (status !== 'done' && status !== 'failed') {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pollResponse = await fetch(`https://api.shotstack.io/v1/render/${renderId}`, {
        headers: {
          'x-api-key': process.env.SHOTSTACK_API_KEY!,
        },
      });

      if (!pollResponse.ok) {
        throw new Error('Failed to poll render status');
      }

      const pollData: ShotstackResponse = await pollResponse.json();
      status = pollData.response.status;
      videoUrl = pollData.response.url;

      if (status === 'failed') {
        throw new Error(`Image animation failed: ${pollData.response.error}`);
      }
    }

    if (!videoUrl) {
      throw new Error('No video URL returned from Shotstack');
    }

    return videoUrl;
  } catch (error) {
    console.error('Error animating image:', error);
    throw error;
  }
}
