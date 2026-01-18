/**
 * FFmpeg Client Service
 * Client-side video compilation using FFmpeg.wasm
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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
  aspectRatio?: 'portrait' | 'landscape' | 'square';
  format?: 'mp4' | 'mov';
}

// Resolution mapping (landscape defaults)
const resolutionMap = {
  '480p': { width: 854, height: 480 },
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4k': { width: 3840, height: 2160 },
};

// Aspect ratio dimensions
function getAspectRatioDimensions(
  aspectRatio: 'portrait' | 'landscape' | 'square',
  resolution: '480p' | '720p' | '1080p' | '4k' = '1080p'
): { width: number; height: number } {
  const baseRes = resolutionMap[resolution];
  
  switch (aspectRatio) {
    case 'portrait':
      // 9:16 ratio
      return {
        width: Math.round(baseRes.height * (9 / 16)),
        height: baseRes.height,
      };
    case 'landscape':
      // 16:9 ratio (default)
      return baseRes;
    case 'square':
      // 1:1 ratio
      const size = Math.min(baseRes.width, baseRes.height);
      return { width: size, height: size };
    default:
      return baseRes;
  }
}

// Global FFmpeg instance
let ffmpegInstance: FFmpeg | null = null;
let isLoaded = false;

/**
 * Get or initialize FFmpeg instance
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && isLoaded) {
    return ffmpegInstance;
  }

  ffmpegInstance = new FFmpeg();
  
  // Enable logging for debugging
  ffmpegInstance.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  // Load FFmpeg.wasm
  try {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    isLoaded = true;
  } catch (error) {
    console.error('Failed to load FFmpeg.wasm:', error);
    throw new Error('Failed to initialize FFmpeg. Please check your browser compatibility.');
  }

  return ffmpegInstance;
}

/**
 * Fetch a file from URL and return as Uint8Array
 */
async function fetchFileAsUint8Array(url: string): Promise<Uint8Array> {
  try {
    return await fetchFile(url);
  } catch (error) {
    console.error(`Failed to fetch file from ${url}:`, error);
    throw new Error(`Failed to fetch file: ${url}`);
  }
}

/**
 * Convert image to video clip with specified duration
 */
async function imageToVideoClip(
  ffmpeg: FFmpeg,
  imageUrl: string,
  duration: number,
  outputName: string,
  resolution: { width: number; height: number },
  transition?: 'fade' | 'zoom' | 'slide'
): Promise<string> {
  // Fetch and write image to FFmpeg filesystem
  const imageData = await fetchFileAsUint8Array(imageUrl);
  const imageFileName = `input_${outputName}.jpg`;
  await ffmpeg.writeFile(imageFileName, imageData);

  // Build filter for transitions
  let filter = '';
  const scale = `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease`;
  const pad = `pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`;

  if (transition === 'zoom-in') {
    filter = `${scale},${pad},zoompan=z='min(max(zoom,pzoom)+0.0015,1.5)':d=${duration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${resolution.width}x${resolution.height}`;
  } else if (transition === 'zoom-out') {
    filter = `${scale},${pad},zoompan=z='max(min(zoom,pzoom)-0.0015,0.8)':d=${duration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${resolution.width}x${resolution.height}`;
  } else {
    // Static or fade - just scale and pad
    filter = `${scale},${pad}`;
  }

  // Convert image to video clip
  await ffmpeg.exec([
    '-loop', '1',
    '-i', imageFileName,
    '-vf', filter,
    '-t', duration.toString(),
    '-pix_fmt', 'yuv420p',
    '-c:v', 'libx264',
    '-r', '25',
    outputName,
  ]);

  // Clean up input image
  await ffmpeg.deleteFile(imageFileName);

  return outputName;
}

/**
 * Create subtitle file for captions
 */
function createSubtitlesSrt(captions: Caption[]): string {
  return captions
    .map((caption, index) => {
      const startTime = formatSRTTime(caption.start);
      const endTime = formatSRTTime(caption.start + caption.duration);
      return `${index + 1}\n${startTime} --> ${endTime}\n${caption.text}\n`;
    })
    .join('\n');
}

/**
 * Format time for SRT format (HH:MM:SS,mmm)
 */
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

/**
 * Get vertical position for captions
 */
function getCaptionPosition(
  position: 'top' | 'center' | 'bottom',
  fontSize: number
): string {
  switch (position) {
    case 'top':
      return `${fontSize + 20}`;
    case 'center':
      return `(h-text_h)/2`;
    case 'bottom':
    default:
      return `h-th-${fontSize + 20}`;
  }
}

/**
 * Compile video from clips, audio, and captions
 */
export async function compileVideo(
  options: VideoCompilationOptions
): Promise<Blob> {
  const {
    clips,
    voiceoverUrl,
    musicUrl,
    musicVolume = 0.3,
    captions = [],
    captionStyle = {},
    resolution = '1080p',
    aspectRatio = 'landscape',
    format = 'mp4',
  } = options;

  if (clips.length === 0) {
    throw new Error('No video clips provided');
  }

  const ffmpeg = await getFFmpeg();
  const dimensions = getAspectRatioDimensions(aspectRatio, resolution);
  const outputFormat = format === 'mov' ? 'mov' : 'mp4';

  try {
    // Step 1: Convert images to video clips
    const clipFiles: string[] = [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const clipFileName = `clip_${i}.mp4`;
      
      if (clip.type === 'image') {
        await imageToVideoClip(
          ffmpeg,
          clip.url,
          clip.duration,
          clipFileName,
          dimensions,
          clip.transition
        );
      } else {
        // For video files, fetch and copy
        const videoData = await fetchFileAsUint8Array(clip.url);
        await ffmpeg.writeFile(clipFileName, videoData);
        // Trim to duration if needed
        if (clip.duration) {
          const tempFileName = `temp_${i}.mp4`;
          await ffmpeg.exec([
            '-i', clipFileName,
            '-t', clip.duration.toString(),
            '-c', 'copy',
            tempFileName,
          ]);
          await ffmpeg.deleteFile(clipFileName);
          // Read temp file and write with original name (FFmpeg.wasm doesn't have rename)
          const tempData = await ffmpeg.readFile(tempFileName);
          await ffmpeg.writeFile(clipFileName, tempData);
          await ffmpeg.deleteFile(tempFileName);
        }
      }
      clipFiles.push(clipFileName);
    }

    // Step 2: Concatenate all video clips
    const listContent = clipFiles.map((name) => `file '${name}'`).join('\n');
    await ffmpeg.writeFile('concat_list.txt', new TextEncoder().encode(listContent));

    const concatenatedVideo = 'concatenated.mp4';
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat_list.txt',
      '-c', 'copy',
      concatenatedVideo,
    ]);

    // Clean up individual clips and list
    for (const file of clipFiles) {
      await ffmpeg.deleteFile(file);
    }
    await ffmpeg.deleteFile('concat_list.txt');

    // Step 3: Prepare audio tracks
    const audioInputs: string[] = [];
    let hasAudio = false;

    if (voiceoverUrl) {
      const voiceoverData = await fetchFileAsUint8Array(voiceoverUrl);
      await ffmpeg.writeFile('voiceover.mp3', voiceoverData);
      audioInputs.push('-i', 'voiceover.mp3');
      hasAudio = true;
    }

    if (musicUrl) {
      const musicData = await fetchFileAsUint8Array(musicUrl);
      await ffmpeg.writeFile('music.mp3', musicData);
      audioInputs.push('-i', 'music.mp3');
      hasAudio = true;
    }

    // Step 4: Add captions if needed
    let videoFilter = `scale=${dimensions.width}:${dimensions.height}`;
    if (captions.length > 0) {
      // Create subtitle file
      const srtContent = createSubtitlesSrt(captions);
      await ffmpeg.writeFile('subtitles.srt', new TextEncoder().encode(srtContent));

      const fontSize = captionStyle.fontSize || 24;
      const color = captionStyle.color || '#ffffff';
      const bgColor = captionStyle.backgroundColor || '#00000080';
      const position = getCaptionPosition(
        captionStyle.position || 'bottom',
        fontSize
      );

      // Build subtitle filter
      videoFilter += `,subtitles=subtitles.srt:force_style='FontSize=${fontSize},PrimaryColour=&H${colorToHex(color)},BackColour=&H${colorToHex(bgColor)},Alignment=10,MarginV=${position}'`;
    }

    // Step 5: Combine video and audio
    const finalOutput = 'final_output.mp4';
    const ffmpegArgs = [
      '-i', concatenatedVideo,
      ...audioInputs,
      '-vf', videoFilter,
    ];

    if (hasAudio) {
      if (voiceoverUrl && musicUrl) {
        // Mix both audio tracks with volume control
        const filterComplex = `[1:a]volume=1.0[voice];[2:a]volume=${musicVolume}[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=0[aout]`;
        ffmpegArgs.push('-filter_complex', filterComplex);
        ffmpegArgs.push('-map', '0:v', '-map', '[aout]');
      } else if (voiceoverUrl) {
        // Only voiceover
        ffmpegArgs.push('-map', '0:v', '-map', '1:a');
      } else if (musicUrl) {
        // Only music with volume control
        const filterComplex = `[1:a]volume=${musicVolume}[aout]`;
        ffmpegArgs.push('-filter_complex', filterComplex);
        ffmpegArgs.push('-map', '0:v', '-map', '[aout]');
      }
    }

    ffmpegArgs.push(
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'medium',
      '-crf', '23',
      '-shortest',
      finalOutput
    );

    await ffmpeg.exec(ffmpegArgs);

    // Clean up intermediate files
    await ffmpeg.deleteFile(concatenatedVideo);
    if (voiceoverUrl) await ffmpeg.deleteFile('voiceover.mp3');
    if (musicUrl) await ffmpeg.deleteFile('music.mp3');
    if (captions.length > 0) await ffmpeg.deleteFile('subtitles.srt');

    // Step 6: Read output and return as Blob
    const outputData = await ffmpeg.readFile(finalOutput);
    await ffmpeg.deleteFile(finalOutput);

    return new Blob([outputData], { type: `video/${outputFormat}` });
  } catch (error) {
    console.error('Error compiling video:', error);
    throw error;
  }
}

/**
 * Convert hex color to format used by FFmpeg subtitles
 */
function colorToHex(color: string): string {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Handle rgba format
  if (color.startsWith('rgba')) {
    const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (matches) {
      const r = parseInt(matches[1]).toString(16).padStart(2, '0');
      const g = parseInt(matches[2]).toString(16).padStart(2, '0');
      const b = parseInt(matches[3]).toString(16).padStart(2, '0');
      const a = matches[4] ? Math.round(parseFloat(matches[4]) * 255).toString(16).padStart(2, '0') : 'ff';
      return `${a}${b}${g}${r}`.toUpperCase(); // BGR format for FFmpeg
    }
  }
  
  // Handle hex color
  if (hex.length === 6) {
    // Convert RGB to BGR and add alpha
    const r = hex.substring(0, 2);
    const g = hex.substring(2, 4);
    const b = hex.substring(4, 6);
    return `FF${b}${g}${r}`.toUpperCase(); // BGR with full alpha
  }
  
  return 'FFFFFFFF'; // Default white
}

/**
 * Animate a static image into a video clip with motion effects
 */
export async function animateImage(options: {
  imageUrl: string;
  duration: number;
  motion?: 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static';
  resolution?: '480p' | '720p' | '1080p' | '4k';
}): Promise<Blob> {
  const {
    imageUrl,
    duration,
    motion = 'zoom-in',
    resolution = '1080p',
  } = options;

  const ffmpeg = await getFFmpeg();
  const dimensions = resolutionMap[resolution];

  try {
    // Fetch and write image
    const imageData = await fetchFileAsUint8Array(imageUrl);
    await ffmpeg.writeFile('input_image.jpg', imageData);

    // Build motion filter
    let filter = '';
    const scale = `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease`;
    const pad = `pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2`;

    if (motion === 'zoom-in') {
      filter = `${scale},${pad},zoompan=z='min(max(zoom,pzoom)+0.0015,1.5)':d=${duration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${dimensions.width}x${dimensions.height}`;
    } else if (motion === 'zoom-out') {
      filter = `${scale},${pad},zoompan=z='max(min(zoom,pzoom)-0.0015,0.8)':d=${duration * 25}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${dimensions.width}x${dimensions.height}`;
    } else if (motion === 'pan-left' || motion === 'pan-right') {
      const direction = motion === 'pan-left' ? -1 : 1;
      filter = `${scale},${pad},crop=${dimensions.width}:${dimensions.height}:${direction * (dimensions.width / duration / 25)}:0`;
    } else {
      // Static
      filter = `${scale},${pad}`;
    }

    // Convert to video
    await ffmpeg.exec([
      '-loop', '1',
      '-i', 'input_image.jpg',
      '-vf', filter,
      '-t', duration.toString(),
      '-pix_fmt', 'yuv420p',
      '-c:v', 'libx264',
      '-r', '25',
      'output.mp4',
    ]);

    // Read output
    const outputData = await ffmpeg.readFile('output.mp4');

    // Cleanup
    await ffmpeg.deleteFile('input_image.jpg');
    await ffmpeg.deleteFile('output.mp4');

    return new Blob([outputData], { type: 'video/mp4' });
  } catch (error) {
    console.error('Error animating image:', error);
    throw error;
  }
}