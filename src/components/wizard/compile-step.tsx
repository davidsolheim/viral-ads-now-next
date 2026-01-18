'use client';

import { useState, useEffect } from 'react';
import { compileVideo, type VideoCompilationOptions } from '@/lib/services/ffmpeg-client';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface CompileStepProps {
  projectId: string;
  onNext: () => void;
}

export function CompileStep({ projectId, onNext }: CompileStepProps) {
  const [video, setVideo] = useState<{ url: string } | null>(null);
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p' | '4k'>('1080p');
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'landscape' | 'square'>('portrait');
  const [duration, setDuration] = useState(30);
  const [includeCaptions, setIncludeCaptions] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Load project settings on mount
  useEffect(() => {
    const loadProjectSettings = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const project = await response.json();
          const settings = project.settings || {};
          if (settings.aspectRatio) {
            setAspectRatio(settings.aspectRatio);
          }
          if (settings.duration) {
            setDuration(settings.duration);
          }
        }
      } catch (error) {
        console.error('Error loading project settings:', error);
      }
    };

    loadProjectSettings();
  }, [projectId]);

  const handleCompile = async () => {
    setIsCompiling(true);
    setProgress('Preparing compilation...');

    try {
      // Step 1: Fetch compilation data from server
      setIsLoadingAssets(true);
      setProgress('Fetching project data...');
      
      const dataResponse = await fetch(`/api/projects/${projectId}/compile-data`);
      if (!dataResponse.ok) {
        const error = await dataResponse.json();
        throw new Error(error.error || 'Failed to fetch project data');
      }

      const { scenes, images, voiceovers, music } = await dataResponse.json();
      
      if (!scenes || scenes.length === 0) {
        throw new Error('No scenes found. Please generate scenes first.');
      }
      
      if (!images || images.length === 0) {
        throw new Error('No images found. Please generate images first.');
      }

      setIsLoadingAssets(false);

      // Step 2: Map images to scenes
      const imagesBySceneId = new Map<string, any>();
      const imagesBySceneNumber = new Map<number, any>();
      for (const image of images) {
        if (image.sceneId) {
          imagesBySceneId.set(image.sceneId, image);
        }
        const sceneNumber = (image.metadata as any)?.sceneNumber;
        if (typeof sceneNumber === 'number') {
          imagesBySceneNumber.set(sceneNumber, image);
        }
      }

      // Step 3: Build video clips from images and scenes
      // Calculate scene duration based on total duration
      const sceneDuration = duration / scenes.length;
      
      const clips = scenes.map((scene: any) => {
        const sceneImage =
          imagesBySceneId.get(scene.id) || imagesBySceneNumber.get(scene.sceneNumber);

        if (!sceneImage) {
          throw new Error(`No image found for scene ${scene.sceneNumber}`);
        }

        return {
          type: 'image' as const,
          url: sceneImage.url,
          duration: sceneDuration,
          transition: 'fade' as const,
        };
      });

      // Step 4: Prepare captions if requested
      let captions = undefined;
      if (includeCaptions) {
        let currentTime = 0;
        captions = scenes.map((scene: any) => {
          const caption = {
            text: scene.scriptText,
            start: currentTime,
            duration: sceneDuration, // Match clip duration
          };
          currentTime += sceneDuration;
          return caption;
        });
      }

      // Step 5: Compile video using FFmpeg.wasm
      setProgress('Compiling video with FFmpeg...');
      const compilationOptions: VideoCompilationOptions = {
        clips,
        voiceoverUrl: voiceovers[0]?.url,
        musicUrl: music[0]?.url,
        musicVolume: 0.3,
        captions,
        resolution,
        aspectRatio,
        format: 'mp4',
      };

      const videoBlob = await compileVideo(compilationOptions);

      // Step 6: Upload compiled video to server
      setProgress('Uploading video...');
      const formData = new FormData();
      formData.append('video', videoBlob, 'final-video.mp4');
      formData.append(
        'options',
        JSON.stringify({
          resolution,
          includeCaptions,
          musicVolume: 0.3,
          durationSeconds: clips.reduce((sum, clip) => sum + clip.duration, 0),
        })
      );

      const uploadResponse = await fetch(`/api/projects/${projectId}/upload-video`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || 'Failed to upload video');
      }

      const result = await uploadResponse.json();
      setVideo(result.video);
      toast.success('Video compiled successfully!');
      onNext();
    } catch (error) {
      console.error('Error compiling video:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to compile video');
    } finally {
      setIsCompiling(false);
      setIsLoadingAssets(false);
      setProgress('');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Compile Video</h2>
      <p className="mt-2 text-gray-600">
        Finalize your settings and compile the video using client-side processing
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'portrait' as const, name: 'Portrait', ratio: '9:16' },
              { id: 'landscape' as const, name: 'Landscape', ratio: '16:9' },
              { id: 'square' as const, name: 'Square', ratio: '1:1' },
            ].map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => setAspectRatio(ratio.id)}
                disabled={isCompiling}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  aspectRatio === ratio.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                } ${isCompiling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div>{ratio.name}</div>
                <div className="text-xs text-gray-500">{ratio.ratio}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Resolution
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['480p', '720p', '1080p', '4k'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResolution(r)}
                disabled={isCompiling}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  resolution === r
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                } ${isCompiling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="captions"
            checked={includeCaptions}
            onChange={(e) => setIncludeCaptions(e.target.checked)}
            disabled={isCompiling}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="captions" className="text-sm font-medium text-gray-900">
            Include captions
          </label>
        </div>

        {!video && !isCompiling && (
          <Button onClick={handleCompile} size="lg">
            Compile Video
          </Button>
        )}

        {isCompiling && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text={progress || 'Compiling your video...'} />
            {isLoadingAssets && (
              <p className="mt-4 text-sm text-gray-500">
                Loading project assets...
              </p>
            )}
            {!isLoadingAssets && (
              <p className="mt-4 text-sm text-gray-500">
                This may take several minutes depending on video length
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}