/**
 * Video Platform Specifications
 * Centralized constants for video requirements across different platforms
 */

// Type Definitions
export type VideoPlatform =
  | 'shopify'
  | 'etsy'
  | 'tiktok'
  | 'youtube'
  | 'instagram'
  | 'facebook'
  | 'amazon'
  | 'pinterest';

export type AspectRatio = '9:16' | '16:9' | '1:1' | '4:5' | '4:3' | '1.91:1';

export type VideoFormat = 'mp4' | 'mov' | 'mpeg' | '3gp' | 'avi' | 'flv' | 'webm' | 'm4v';

export interface AspectRatioSpec {
  ratio: AspectRatio;
  preferred: boolean;
}

export interface LengthSpec {
  min: number; // in seconds
  max: number; // in seconds
  recommended: number[]; // array of recommended durations in seconds
}

export interface Resolution {
  width: number;
  height: number;
}

export interface ResolutionSpec {
  min?: Resolution;
  recommended: Resolution;
  max?: Resolution;
}

export interface AudioRequirement {
  required: boolean;
  codec?: string;
  bitrate?: number; // in kbps
  sampleRate?: number; // in Hz
}

export interface OtherRequirements {
  audio?: AudioRequirement;
  codec?: string;
  frameRate?: string | number;
  dynamicContent?: boolean;
  staticImageLimit?: number; // max percentage (0-1) of static images
  captions?: {
    required: boolean;
    recommended: boolean;
  };
  noQRCodes?: boolean; // for certain markets
  [key: string]: unknown; // for platform-specific requirements
}

export interface VideoSpec {
  name: string;
  lengths: LengthSpec;
  formats: VideoFormat[];
  aspectRatios: AspectRatioSpec[];
  fileSizeMax: number; // in bytes
  resolutions: ResolutionSpec;
  otherRequirements: OtherRequirements;
  bestPractices: string[];
}

export type VideoSpecs = Record<VideoPlatform, VideoSpec>;

// Platform Specifications
export const VIDEO_SPECS: VideoSpecs = {
  shopify: {
    name: 'Shopify',
    lengths: {
      min: 1,
      max: 60,
      recommended: [15, 30, 60],
    },
    formats: ['mp4', 'mov'],
    aspectRatios: [
      { ratio: '16:9', preferred: true },
      { ratio: '9:16', preferred: false },
      { ratio: '1:1', preferred: false },
    ],
    fileSizeMax: 1024 * 1024 * 1024, // 1GB
    resolutions: {
      min: { width: 854, height: 480 },
      recommended: { width: 4096, height: 2160 }, // 4K
      max: { width: 4096, height: 2160 },
    },
    otherRequirements: {
      codec: 'h264',
      captions: {
        required: false,
        recommended: true,
      },
    },
    bestPractices: [
      'Keep videos concise to match ad platform expectations',
      'Use H.264 codec for broader compatibility',
      'Add captions for accessibility',
    ],
  },

  etsy: {
    name: 'Etsy',
    lengths: {
      min: 5,
      max: 15,
      recommended: [5, 10, 15],
    },
    formats: ['mp4', 'mov', 'flv'],
    aspectRatios: [
      { ratio: '4:3', preferred: false },
      { ratio: '9:16', preferred: true },
    ],
    fileSizeMax: 100 * 1024 * 1024, // 100MB
    resolutions: {
      min: { width: 1000, height: 750 },
      recommended: { width: 1080, height: 1920 },
    },
    otherRequirements: {
      audio: {
        required: false,
      },
      dynamicContent: true,
    },
    bestPractices: [
      'Use to demonstrate item use',
      'Shoppers respond well to lifestyle or detail-focused clips',
      'Ensure videos are dynamic and free of grammatical errors in text overlays',
    ],
  },

  tiktok: {
    name: 'TikTok',
    lengths: {
      min: 5,
      max: 60,
      recommended: [9, 15],
    },
    formats: ['mp4', 'mov', 'mpeg', '3gp'],
    aspectRatios: [
      { ratio: '9:16', preferred: true },
      { ratio: '1:1', preferred: false },
      { ratio: '16:9', preferred: false },
    ],
    fileSizeMax: 500 * 1024 * 1024, // 500MB
    resolutions: {
      min: { width: 540, height: 960 },
      recommended: { width: 1080, height: 1920 },
    },
    otherRequirements: {
      audio: {
        required: true,
        codec: 'aac',
      },
      codec: 'h264',
      dynamicContent: true,
      staticImageLimit: 0.5, // Max 50% static images
      noQRCodes: true, // in select markets
    },
    bestPractices: [
      'Use 9:16 for native feel',
      'Test shorter lengths for higher completion rates',
      'Ensure high resolution and legible text',
      'Encourage interaction - no motionless elements',
    ],
  },

  youtube: {
    name: 'YouTube',
    lengths: {
      min: 6,
      max: 600, // 10 minutes, but can be longer
      recommended: [6, 15, 20],
    },
    formats: ['mp4', 'mov', 'avi', 'flv', 'webm', 'mpeg'],
    aspectRatios: [
      { ratio: '16:9', preferred: true },
      { ratio: '9:16', preferred: false },
      { ratio: '1:1', preferred: false },
      { ratio: '4:3', preferred: false },
      { ratio: '4:5', preferred: false },
    ],
    fileSizeMax: 256 * 1024 * 1024 * 1024, // 256GB
    resolutions: {
      min: { width: 854, height: 480 }, // 480p
      recommended: { width: 1920, height: 1080 }, // 1080p
    },
    otherRequirements: {
      audio: {
        required: false,
        codec: 'aac-lc',
      },
      codec: 'h264',
    },
    bestPractices: [
      'Use 16:9 for desktop/CTV viewing',
      'Include calls-to-action within safe areas',
      'Upload highest available resolution',
    ],
  },

  instagram: {
    name: 'Instagram',
    lengths: {
      min: 1,
      max: 60,
      recommended: [1, 15],
    },
    formats: ['mp4', 'mov'],
    aspectRatios: [
      { ratio: '4:5', preferred: true },
      { ratio: '9:16', preferred: true }, // for Stories/Reels
      { ratio: '1:1', preferred: false },
      { ratio: '1.91:1', preferred: false },
    ],
    fileSizeMax: 4 * 1024 * 1024 * 1024, // 4GB
    resolutions: {
      min: { width: 600, height: 600 },
      recommended: { width: 1080, height: 1920 }, // 9:16
    },
    otherRequirements: {
      codec: 'h264',
      captions: {
        required: false,
        recommended: true,
      },
    },
    bestPractices: [
      'Use 9:16 for Stories/Reels to avoid cropping',
      'Add text overlays for silent viewing',
      'Upload highest available resolution',
    ],
  },

  facebook: {
    name: 'Facebook',
    lengths: {
      min: 1,
      max: 14460, // 241 minutes
      recommended: [5, 15, 30, 120],
    },
    formats: ['mp4', 'mov', 'gif'],
    aspectRatios: [
      { ratio: '1:1', preferred: true },
      { ratio: '4:5', preferred: true }, // mobile-only
    ],
    fileSizeMax: 4 * 1024 * 1024 * 1024, // 4GB
    resolutions: {
      min: { width: 120, height: 120 },
      recommended: { width: 1440, height: 1440 }, // 1:1
    },
    otherRequirements: {
      codec: 'h264',
      audio: {
        required: false,
        codec: 'aac',
        bitrate: 128,
      },
      captions: {
        required: false,
        recommended: true,
      },
    },
    bestPractices: [
      'Optimize for mobile with 4:5 ratio',
      'No footer on mobile Feed for awareness objectives',
      'Use fixed frame rate',
    ],
  },

  amazon: {
    name: 'Amazon',
    lengths: {
      min: 1,
      max: 180, // 3 minutes
      recommended: [15],
    },
    formats: ['mp4', 'mov'],
    aspectRatios: [
      { ratio: '16:9', preferred: true },
    ],
    fileSizeMax: 500 * 1024 * 1024, // 500MB
    resolutions: {
      min: { width: 854, height: 480 },
      recommended: { width: 1920, height: 1080 },
    },
    otherRequirements: {
      codec: 'h264',
      audio: {
        required: false,
        codec: 'aac',
        bitrate: 128,
        sampleRate: 44000,
      },
      frameRate: 15, // minimum 15 FPS
    },
    bestPractices: [
      'Include shoppable CTAs like "Shop now"',
      'Autoplay muted',
      'No letterboxing',
    ],
  },

  pinterest: {
    name: 'Pinterest',
    lengths: {
      min: 4,
      max: 900, // 15 minutes
      recommended: [6, 15],
    },
    formats: ['mp4', 'mov', 'm4v'],
    aspectRatios: [
      { ratio: '9:16', preferred: true },
      { ratio: '1:1', preferred: false },
    ],
    fileSizeMax: 2 * 1024 * 1024 * 1024, // 2GB
    resolutions: {
      min: { width: 600, height: 600 },
      recommended: { width: 1080, height: 1920 },
    },
    otherRequirements: {
      audio: {
        required: false,
      },
    },
    bestPractices: [
      'Use vertical for engagement',
      'Include cover images',
      'Autoplay in feed (no audio initially)',
    ],
  },
};

// Helper Functions

/**
 * Get video specifications for a specific platform
 */
export function getPlatformSpec(platform: VideoPlatform): VideoSpec {
  return VIDEO_SPECS[platform];
}

/**
 * Get recommended settings for a platform
 */
export function getRecommendedSpec(platform: VideoPlatform) {
  const spec = getPlatformSpec(platform);
  const preferredAspectRatio = spec.aspectRatios.find((ar) => ar.preferred) || spec.aspectRatios[0];
  const recommendedLength = spec.lengths.recommended[0] || spec.lengths.min;

  return {
    aspectRatio: preferredAspectRatio.ratio,
    resolution: spec.resolutions.recommended,
    duration: recommendedLength,
    format: spec.formats[0] as 'mp4' | 'mov',
  };
}

/**
 * Convert platform specs to FFmpeg compilation options
 */
export function convertSpecToFFmpegOptions(platform: VideoPlatform): {
  resolution: '480p' | '720p' | '1080p' | '4k';
  aspectRatio: 'portrait' | 'landscape' | 'square';
  format: 'mp4' | 'mov';
} {
  const spec = getPlatformSpec(platform);
  const preferredAspectRatio = spec.aspectRatios.find((ar) => ar.preferred) || spec.aspectRatios[0];
  const recommendedRes = spec.resolutions.recommended;

  // Map aspect ratio
  let aspectRatio: 'portrait' | 'landscape' | 'square';
  if (preferredAspectRatio.ratio === '9:16') {
    aspectRatio = 'portrait';
  } else if (preferredAspectRatio.ratio === '16:9' || preferredAspectRatio.ratio === '1.91:1') {
    aspectRatio = 'landscape';
  } else {
    aspectRatio = 'square';
  }

  // Map resolution
  let resolution: '480p' | '720p' | '1080p' | '4k';
  if (recommendedRes.height >= 2160) {
    resolution = '4k';
  } else if (recommendedRes.height >= 1080) {
    resolution = '1080p';
  } else if (recommendedRes.height >= 720) {
    resolution = '720p';
  } else {
    resolution = '480p';
  }

  // Map format
  const format = spec.formats.includes('mp4') ? 'mp4' : 'mov';

  return {
    resolution,
    aspectRatio,
    format,
  };
}

/**
 * Validate a video file against platform requirements
 */
export function validateVideoForPlatform(
  video: {
    duration?: number;
    size?: number;
    width?: number;
    height?: number;
    format?: string;
  },
  platform: VideoPlatform
): { valid: boolean; errors: string[] } {
  const spec = getPlatformSpec(platform);
  const errors: string[] = [];

  // Check duration
  if (video.duration !== undefined) {
    if (video.duration < spec.lengths.min) {
      errors.push(`Video duration (${video.duration}s) is below minimum (${spec.lengths.min}s)`);
    }
    if (video.duration > spec.lengths.max) {
      errors.push(`Video duration (${video.duration}s) exceeds maximum (${spec.lengths.max}s)`);
    }
  }

  // Check file size
  if (video.size !== undefined) {
    if (video.size > spec.fileSizeMax) {
      errors.push(
        `File size (${(video.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum (${(spec.fileSizeMax / 1024 / 1024).toFixed(2)}MB)`
      );
    }
  }

  // Check resolution
  if (video.width !== undefined && video.height !== undefined) {
    const minRes = spec.resolutions.min;
    if (minRes) {
      if (video.width < minRes.width || video.height < minRes.height) {
        errors.push(
          `Resolution (${video.width}x${video.height}) is below minimum (${minRes.width}x${minRes.height})`
        );
      }
    }
  }

  // Check format
  if (video.format !== undefined) {
    const format = video.format.toLowerCase().replace('.', '') as VideoFormat;
    if (!spec.formats.includes(format)) {
      errors.push(`Format (${video.format}) is not supported. Supported formats: ${spec.formats.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get all supported platforms
 */
export function getSupportedPlatforms(): VideoPlatform[] {
  return Object.keys(VIDEO_SPECS) as VideoPlatform[];
}

/**
 * Get platform display name
 */
export function getPlatformName(platform: VideoPlatform): string {
  return VIDEO_SPECS[platform].name;
}
