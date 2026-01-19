'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { compileVideo } from '@/lib/services/ffmpeg-client';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface PreviewStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

export function PreviewStep({ projectId, onNext, readOnly = false }: PreviewStepProps) {
  const [images, setImages] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [scriptText, setScriptText] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const [imagesRes, videosRes, scriptsRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/images`),
          fetch(`/api/projects/${projectId}/video`),
          fetch(`/api/projects/${projectId}/script`),
        ]);

        if (imagesRes.ok) {
          const data = await imagesRes.json();
          setImages(data.images || []);
        }
        if (videosRes.ok) {
          const data = await videosRes.json();
          setVideos(data.videos || []);
        }
        if (scriptsRes.ok) {
          const data = await scriptsRes.json();
          const selected = (data.scripts || []).find((s: any) => s.isSelected);
          setScriptText(selected?.content || '');
        }
      } catch (error) {
        console.error('Error loading assets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();
  }, [projectId]);

  const compile = async (targetResolution: '480p' | '720p' | '1080p' | '4k', isPreview: boolean) => {
    setIsCompiling(true);
    try {
      const dataResponse = await fetch(`/api/projects/${projectId}/compile-data`);
      if (!dataResponse.ok) throw new Error('Failed to fetch project data');
      const { scenes, images: sceneImages, voiceovers, music } = await dataResponse.json();

      if (!scenes || scenes.length === 0) throw new Error('No scenes found');
      if (!sceneImages || sceneImages.length === 0) throw new Error('No images found');

      const sceneDuration = 30 / scenes.length;
      const clips = scenes.map((scene: any) => {
        const sceneImage = sceneImages.find((img: any) => img.sceneId === scene.id);
        if (!sceneImage) throw new Error(`No image for scene ${scene.sceneNumber}`);
        return {
          type: 'image' as const,
          url: sceneImage.url,
          duration: sceneDuration,
          transition: 'fade' as const,
        };
      });

      const videoBlob = await compileVideo({
        clips,
        voiceoverUrl: voiceovers[0]?.url,
        musicUrl: music[0]?.url,
        musicVolume: 0.3,
        captions: undefined,
        resolution: targetResolution,
        aspectRatio: 'portrait',
        format: 'mp4',
      });

      const formData = new FormData();
      formData.append('video', videoBlob, isPreview ? 'preview.mp4' : 'final.mp4');
      formData.append('options', JSON.stringify({ resolution: targetResolution }));

      const uploadResponse = await fetch(`/api/projects/${projectId}/upload-video`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload video');
      const result = await uploadResponse.json();

      if (isPreview) {
        setPreviewUrl(result.video?.url || null);
      } else {
        setFinalUrl(result.video?.url || null);
      }

      toast.success(isPreview ? 'Preview generated!' : 'Final video exported!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to compile video');
    } finally {
      setIsCompiling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading preview assets..." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Preview</h2>
        <p className="mt-2 text-muted">AI prepared your video for download.</p>
        {previewUrl && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-foreground">Preview</h3>
            <video controls className="w-full rounded-lg">
              <source src={previewUrl} />
            </video>
          </div>
        )}
        {finalUrl && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-medium text-foreground">Final Video</h3>
            <video controls className="w-full rounded-lg">
              <source src={finalUrl} />
            </video>
            <a href={finalUrl} download className="text-sm text-brand underline">
              Download Final Video
            </a>
          </div>
        )}
        {!previewUrl && !finalUrl && (
          <p className="mt-6 text-sm text-muted">Preview is not available yet.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Preview & Export</h2>
      <p className="mt-2 text-gray-600">Compile a preview and export the final video.</p>

      <div className="mt-6 space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Images ({images.length})</h3>
            <div className="grid grid-cols-3 gap-2">
              {images.slice(0, 6).map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image src={img.url} alt="Image" fill sizes="100px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Videos ({videos.length})</h3>
            <div className="space-y-2">
              {videos.slice(0, 2).map((vid) => (
                <video key={vid.id} controls className="w-full rounded-lg">
                  <source src={vid.url} />
                </video>
              ))}
            </div>
          </div>
        </div>

        {scriptText && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Selected Script</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{scriptText}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={() => compile('480p', true)} disabled={isCompiling}>
            Generate Preview (480p)
          </Button>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as any)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
            <option value="4k">4K</option>
          </select>
          <Button onClick={() => compile(resolution, false)} disabled={isCompiling}>
            Export Final
          </Button>
        </div>

        {previewUrl && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">Preview</h3>
            <video controls className="w-full rounded-lg">
              <source src={previewUrl} />
            </video>
          </div>
        )}

        {finalUrl && (
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">Final Video</h3>
            <video controls className="w-full rounded-lg">
              <source src={finalUrl} />
            </video>
            <a href={finalUrl} download className="text-sm text-brand underline">
              Download Final Video
            </a>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={onNext}>Continue to TikTok</Button>
        </div>
      </div>
    </div>
  );
}
