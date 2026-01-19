'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useGenerateScenes } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface ScenesStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

interface Scene {
  id: string;
  sceneNumber: number;
  scriptText: string;
  visualDescription: string;
  imagePrompt?: string;
  videoPrompt?: string;
  metadata?: any;
}

const IMAGE_MODELS = [
  { id: 'nano-banana', name: 'Nano Banana' },
  { id: 'seedream-4', name: 'SeeDream 4' },
  { id: 'flux-2-flex', name: 'FLUX.2 Flex' },
  { id: 'kling-image-o1', name: 'Kling Image O1' },
];

const VIDEO_MODELS = [
  { id: 'veo-3-1-fast', name: 'Veo 3.1 Fast' },
  { id: 'seedance-pro', name: 'Seedance Pro' },
  { id: 'kling-v2-5', name: 'Kling V2.5' },
  { id: 'kling-v2-6', name: 'Kling V2.6 (7¢/sec)' },
  { id: 'kling-video-o1', name: 'Kling Video O1' },
];

export function ScenesStep({ projectId, onNext, readOnly = false }: ScenesStepProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [targetScenes, setTargetScenes] = useState(4);
  const [imageModel, setImageModel] = useState<string>('flux-2-flex');
  const [videoModel, setVideoModel] = useState<string>('kling-v2-6');
  const [enhancingPrompt, setEnhancingPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const generateScenes = useGenerateScenes(projectId);

  // Load existing scenes
  useEffect(() => {
    const loadScenes = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/scenes`);
        if (response.ok) {
          const data = await response.json();
          if (data.scenes && data.scenes.length > 0) {
            setScenes(data.scenes.map((s: any) => ({
              ...s,
              videoPrompt: s.metadata?.videoPrompt || '',
              imagePrompt: s.imagePrompt || s.visualDescription,
            })));
          }
        }
      } catch (error) {
        console.error('Error loading scenes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadScenes();
  }, [projectId]);

  // Load project settings for default models
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          const settings = data.project?.settings || {};
          if (settings.image_model) setImageModel(settings.image_model);
          if (settings.video_model) setVideoModel(settings.video_model);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };

    loadSettings();
  }, [projectId]);

  const handleGenerate = async () => {
    try {
      const result = await generateScenes.mutateAsync({ targetScenes });
      const scenesWithPrompts = result.scenes.map((s: any) => ({
        ...s,
        imagePrompt: s.imagePrompt || s.visualDescription,
        videoPrompt: s.metadata?.videoPrompt || '',
      }));
      setScenes(scenesWithPrompts);
      toast.success('Scenes generated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate scenes');
    }
  };

  const handleUpdatePrompt = async (sceneId: string, type: 'image' | 'video', prompt: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/scenes/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [type === 'image' ? 'imagePrompt' : 'videoPrompt']: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update prompt');
      }

      setScenes((prev) =>
        prev.map((s) =>
          s.id === sceneId
            ? { ...s, [type === 'image' ? 'imagePrompt' : 'videoPrompt']: prompt }
            : s
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update prompt');
    }
  };

  const handleEnhancePrompt = async (sceneId: string, type: 'image' | 'video', currentPrompt: string) => {
    const promptKey = `${sceneId}-${type}`;
    setEnhancingPrompt(promptKey);
    try {
      const scene = scenes.find((s) => s.id === sceneId);
      const response = await fetch(`/api/projects/${projectId}/scenes/${sceneId}/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentPrompt,
          type,
          context: {
            sceneNumber: scene?.sceneNumber,
            script: scene?.scriptText,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to enhance prompt');
      }

      const result = await response.json();
      await handleUpdatePrompt(sceneId, type, result.enhancedPrompt);
      toast.success('Prompt enhanced!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enhance prompt');
    } finally {
      setEnhancingPrompt(null);
    }
  };

  const handleSaveModels = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_model: imageModel,
          video_model: videoModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save model settings');
      }

      toast.success('Model settings saved!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading scenes..." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Scenes</h2>
        <p className="mt-2 text-muted">AI created the scene breakdown.</p>
        <div className="mt-6 space-y-4">
          {scenes.length > 0 ? (
            scenes.map((scene) => (
              <div key={scene.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-2 text-sm font-semibold text-foreground">
                  Scene {scene.sceneNumber}
                </div>
                <div className="text-xs text-subtle">Script</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{scene.scriptText}</p>
                <div className="mt-3 text-xs text-subtle">Visual</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {scene.visualDescription}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">Scenes are not available yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Break into Scenes</h2>
      <p className="mt-2 text-gray-600">
        AI will break your script into visual scenes with image and video prompts
      </p>

      <div className="mt-6 space-y-6">
        {scenes.length === 0 && (
          <>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Number of Scenes: {targetScenes}
              </label>
              <input
                type="range"
                min="3"
                max="5"
                value={targetScenes}
                onChange={(e) => setTargetScenes(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-xs text-subtle">
                <span>3 scenes</span>
                <span>5 scenes</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Image Model
                </label>
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  {IMAGE_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Video Model
                </label>
                <select
                  value={videoModel}
                  onChange={(e) => setVideoModel(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                >
                  {VIDEO_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!generateScenes.isPending && (
              <Button onClick={handleGenerate} size="lg">
                Generate Scenes
              </Button>
            )}
          </>
        )}

        {generateScenes.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Breaking script into scenes..." />
          </div>
        )}

        {scenes.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Default Image Model
                  </label>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    {IMAGE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Default Video Model
                  </label>
                  <select
                    value={videoModel}
                    onChange={(e) => setVideoModel(e.target.value)}
                    className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  >
                    {VIDEO_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveModels}
                className="mt-3"
              >
                Save Model Settings
              </Button>
            </div>

            <div className="space-y-4">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="rounded-xl border border-border bg-surface p-6"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                      {scene.sceneNumber}
                    </span>
                    <h3 className="font-semibold text-foreground">
                      Scene {scene.sceneNumber}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="mb-1 text-sm font-medium text-muted">Script:</p>
                      <p className="text-sm text-muted">{scene.scriptText}</p>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Image Prompt (max 300 chars)
                      </label>
                      <textarea
                        className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        rows={3}
                        maxLength={300}
                        value={scene.imagePrompt || scene.visualDescription}
                        onChange={(e) => {
                          const newScenes = scenes.map((s) =>
                            s.id === scene.id ? { ...s, imagePrompt: e.target.value } : s
                          );
                          setScenes(newScenes);
                        }}
                        onBlur={() => handleUpdatePrompt(scene.id, 'image', scene.imagePrompt || scene.visualDescription)}
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-subtle">
                          {(scene.imagePrompt || scene.visualDescription).length} / 300
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnhancePrompt(scene.id, 'image', scene.imagePrompt || scene.visualDescription)}
                          disabled={enhancingPrompt === `${scene.id}-image`}
                        >
                          {enhancingPrompt === `${scene.id}-image` ? 'Enhancing...' : 'Enhance'}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-foreground">
                        Video Prompt (max 500 chars)
                      </label>
                      <textarea
                        className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        rows={3}
                        maxLength={500}
                        value={scene.videoPrompt || ''}
                        onChange={(e) => {
                          const newScenes = scenes.map((s) =>
                            s.id === scene.id ? { ...s, videoPrompt: e.target.value } : s
                          );
                          setScenes(newScenes);
                        }}
                        onBlur={() => handleUpdatePrompt(scene.id, 'video', scene.videoPrompt || '')}
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-subtle">
                          {(scene.videoPrompt || '').length} / 500
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnhancePrompt(scene.id, 'video', scene.videoPrompt || '')}
                          disabled={enhancingPrompt === `${scene.id}-video`}
                        >
                          {enhancingPrompt === `${scene.id}-video` ? 'Enhancing...' : 'Enhance'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate}>
                Regenerate All
              </Button>
              <Button onClick={onNext}>
                Continue to Images
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
