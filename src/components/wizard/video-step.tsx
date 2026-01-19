'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface VideoStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

interface Scene {
  id: string;
  sceneNumber: number;
  scriptText: string;
  visualDescription: string;
  metadata?: any;
}

interface MediaAsset {
  id: string;
  url: string;
  sceneId?: string | null;
  metadata?: any;
}

const VIDEO_MODELS = [
  { id: 'veo-3-1-fast', name: 'Veo 3.1 Fast' },
  { id: 'seedance-pro', name: 'Seedance Pro' },
  { id: 'kling-v2-5', name: 'Kling V2.5' },
  { id: 'kling-video-o1', name: 'Kling Video O1' },
];

export function VideoStep({ projectId, onNext, readOnly = false }: VideoStepProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [images, setImages] = useState<MediaAsset[]>([]);
  const [videos, setVideos] = useState<MediaAsset[]>([]);
  const [videoPromptByScene, setVideoPromptByScene] = useState<Record<string, string>>({});
  const [modelByScene, setModelByScene] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scenesRes, imagesRes, videosRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/scenes`),
          fetch(`/api/projects/${projectId}/images`),
          fetch(`/api/projects/${projectId}/video`),
        ]);

        if (scenesRes.ok) {
          const data = await scenesRes.json();
          const scenesData = data.scenes || [];
          setScenes(scenesData);
          setVideoPromptByScene(
            scenesData.reduce((acc: any, scene: any) => {
              acc[scene.id] = scene.metadata?.videoPrompt || '';
              return acc;
            }, {})
          );
        }

        if (imagesRes.ok) {
          const data = await imagesRes.json();
          setImages(data.images || []);
        }

        if (videosRes.ok) {
          const data = await videosRes.json();
          setVideos(data.videos || []);
        }
      } catch (error) {
        console.error('Error loading video step data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const handleSavePrompt = async (sceneId: string, prompt: string) => {
    try {
      await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPrompt: prompt }),
      });
    } catch (error) {
      console.error('Failed to save video prompt:', error);
    }
  };

  const handleEnhancePrompt = async (scene: Scene) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/scenes/${scene.id}/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPromptByScene[scene.id] || '',
          type: 'video',
          context: {
            sceneNumber: scene.sceneNumber,
            script: scene.scriptText,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to enhance prompt');
      const result = await response.json();
      setVideoPromptByScene((prev) => ({ ...prev, [scene.id]: result.enhancedPrompt }));
      await handleSavePrompt(scene.id, result.enhancedPrompt);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enhance prompt');
    }
  };

  const handleGenerateVideo = async (scene: Scene) => {
    setIsGenerating(scene.id);
    try {
      const response = await fetch(`/api/projects/${projectId}/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
          prompt: videoPromptByScene[scene.id] || '',
          model: modelByScene[scene.id] || 'kling-v2-5',
        }),
      });

      if (!response.ok) throw new Error('Failed to generate video');
      const result = await response.json();
      if (result.video) {
        setVideos((prev) => [result.video, ...prev]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate video');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleUploadVideo = async (
    sceneId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsGenerating(sceneId);
    try {
      const formData = new FormData();
      formData.append('video', file);
      const response = await fetch(`/api/projects/${projectId}/video/${sceneId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload video');
      const result = await response.json();
      if (result.video) {
        setVideos((prev) => [result.video, ...prev]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload video');
    } finally {
      setIsGenerating(null);
      event.target.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading video step..." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Video</h2>
        <p className="mt-2 text-muted">AI generated video clips for each scene.</p>
        <div className="mt-6 space-y-4">
          {scenes.map((scene) => {
            const sceneVideos = videos.filter((vid) => vid.sceneId === scene.id);
            return (
              <div key={scene.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-3 text-sm font-semibold text-foreground">
                  Scene {scene.sceneNumber}
                </div>
                {sceneVideos.length ? (
                  <div className="space-y-2">
                    {sceneVideos.map((vid) => (
                      <video key={vid.id} controls className="w-full rounded-lg">
                        <source src={vid.url} />
                      </video>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No videos yet.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Animate Images into Video</h2>
      <p className="mt-2 text-muted">
        Generate video clips for each scene using your selected model and prompt.
      </p>

      <div className="mt-6 space-y-6">
        {scenes.map((scene) => {
          const sceneImage = images.find((img) => img.sceneId === scene.id);
          const sceneVideos = videos.filter((vid) => vid.sceneId === scene.id);

          return (
            <div key={scene.id} className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {scene.sceneNumber}
                </span>
                <h3 className="font-semibold text-foreground">Scene {scene.sceneNumber}</h3>
              </div>

              <div className="space-y-4">
                {sceneImage && (
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-surface-muted">
                    <Image src={sceneImage.url} alt="Scene" fill sizes="400px" className="object-cover" />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Video Model
                  </label>
                  <select
                    value={modelByScene[scene.id] || 'kling-v2-5'}
                    onChange={(e) =>
                      setModelByScene((prev) => ({ ...prev, [scene.id]: e.target.value }))
                    }
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    {VIDEO_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Video Prompt (max 500 chars)
                  </label>
                  <textarea
                    className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    rows={3}
                    maxLength={500}
                    value={videoPromptByScene[scene.id] || ''}
                    onChange={(e) =>
                      setVideoPromptByScene((prev) => ({ ...prev, [scene.id]: e.target.value }))
                    }
                    onBlur={() => handleSavePrompt(scene.id, videoPromptByScene[scene.id] || '')}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-subtle">
                      {(videoPromptByScene[scene.id] || '').length} / 500
                    </span>
                    <Button size="sm" variant="outline" onClick={() => handleEnhancePrompt(scene)}>
                      Enhance
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={() => handleGenerateVideo(scene)} disabled={isGenerating === scene.id}>
                    {isGenerating === scene.id ? 'Generating...' : 'Generate Video'}
                  </Button>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(event) => handleUploadVideo(scene.id, event)}
                      disabled={isGenerating === scene.id}
                    />
                    <Button size="sm" variant="outline" disabled={isGenerating === scene.id}>
                      Upload Custom
                    </Button>
                  </label>
                </div>

                {sceneVideos.length > 0 && (
                  <div className="space-y-2">
                    {sceneVideos.slice(0, 2).map((vid) => (
                      <video key={vid.id} controls className="w-full rounded-lg">
                        <source src={vid.url} />
                      </video>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex gap-3">
          <Button onClick={onNext}>Continue to Voiceover</Button>
        </div>
      </div>
    </div>
  );
}
