'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface ImagesStepProps {
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
}

interface MediaAsset {
  id: string;
  url: string;
  sceneId?: string | null;
  metadata?: any;
}

const IMAGE_MODELS = [
  { id: 'nano-banana', name: 'Nano Banana' },
  { id: 'seedream-4', name: 'SeeDream 4' },
  { id: 'flux-2-flex', name: 'FLUX.2 Flex' },
  { id: 'kling-image-o1', name: 'Kling Image O1' },
];

export function ImagesStep({ projectId, onNext, readOnly = false }: ImagesStepProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [generatedImages, setGeneratedImages] = useState<MediaAsset[]>([]);
  const [referenceImages, setReferenceImages] = useState<MediaAsset[]>([]);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [modelByScene, setModelByScene] = useState<Record<string, string>>({});
  const [selectedReferences, setSelectedReferences] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [feedbackForImage, setFeedbackForImage] = useState<MediaAsset | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scenesRes, imagesRes, productRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/scenes`),
          fetch(`/api/projects/${projectId}/images`),
          fetch(`/api/projects/${projectId}/product`),
        ]);

        if (scenesRes.ok) {
          const data = await scenesRes.json();
          setScenes(
            (data.scenes || []).map((s: any) => ({
              ...s,
              imagePrompt: s.imagePrompt || s.visualDescription,
            }))
          );
        }

        if (imagesRes.ok) {
          const data = await imagesRes.json();
          const images = data.images || [];
          setGeneratedImages(images.filter((img: any) => img.metadata?.source !== 'reference'));
          setReferenceImages(images.filter((img: any) => img.metadata?.source === 'reference'));
        }

        if (productRes.ok) {
          const data = await productRes.json();
          const product = data.product;
          setProductImages(product?.images || []);
        }
      } catch (error) {
        console.error('Error loading images data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const referenceLibrary = useMemo(() => {
    const productRefs = productImages.map((url) => ({
      id: url,
      url,
      metadata: { source: 'product' },
    }));
    return [...productRefs, ...referenceImages];
  }, [productImages, referenceImages]);

  const handleEnhancePrompt = async (scene: Scene) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/scenes/${scene.id}/enhance-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scene.imagePrompt || scene.visualDescription,
          type: 'image',
          context: {
            sceneNumber: scene.sceneNumber,
            script: scene.scriptText,
          },
        }),
      });

      if (!response.ok) throw new Error('Failed to enhance prompt');
      const result = await response.json();

      setScenes((prev) =>
        prev.map((s) =>
          s.id === scene.id ? { ...s, imagePrompt: result.enhancedPrompt } : s
        )
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to enhance prompt');
    }
  };

  const handleSavePrompt = async (scene: Scene, prompt: string) => {
    try {
      await fetch(`/api/projects/${projectId}/scenes/${scene.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagePrompt: prompt }),
      });
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

  const handleGenerateImage = async (scene: Scene) => {
    setIsGenerating(scene.id);
    try {
      const response = await fetch(`/api/projects/${projectId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId: scene.id,
          prompt: scene.imagePrompt || scene.visualDescription,
          model: modelByScene[scene.id] || 'flux-2-flex',
          referenceImages: selectedReferences[scene.id] || [],
        }),
      });

      if (!response.ok) throw new Error('Failed to generate image');
      const result = await response.json();
      const newImage = result.images?.[0]?.asset;

      if (newImage) {
        setGeneratedImages((prev) => [newImage, ...prev]);
        setFeedbackForImage(newImage);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleReferenceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingReference(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`/api/projects/${projectId}/images/reference`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload reference image');
      const result = await response.json();
      setReferenceImages((prev) => [result.asset, ...prev]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload reference');
    } finally {
      setIsUploadingReference(false);
      event.target.value = '';
    }
  };

  const handleCustomUpload = async (
    sceneId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsGenerating(sceneId);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const response = await fetch(`/api/projects/${projectId}/scenes/${sceneId}/images/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload custom image');
      const result = await response.json();
      if (result.asset) {
        setGeneratedImages((prev) => [result.asset, ...prev]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsGenerating(null);
      event.target.value = '';
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackForImage || !feedbackText.trim()) {
      setFeedbackForImage(null);
      setFeedbackText('');
      return;
    }
    try {
      await fetch(`/api/projects/${projectId}/images/${feedbackForImage.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedbackText.trim() }),
      });
    } catch (error) {
      console.error('Failed to save feedback:', error);
    } finally {
      setFeedbackForImage(null);
      setFeedbackText('');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading image generation..." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Images</h2>
        <p className="mt-2 text-muted">AI generated images for each scene.</p>
        <div className="mt-6 space-y-4">
          {scenes.map((scene) => {
            const sceneImages = generatedImages.filter((img) => img.sceneId === scene.id);
            return (
              <div key={scene.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="mb-3 text-sm font-semibold text-foreground">
                  Scene {scene.sceneNumber}
                </div>
                {sceneImages.length ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {sceneImages.map((img) => (
                      <div
                        key={img.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-border bg-surface"
                      >
                        <Image src={img.url} alt="Scene image" fill sizes="150px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No images yet.</p>
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
      <h2 className="text-2xl font-bold text-gray-900">Generate Images</h2>
      <p className="mt-2 text-muted">
        Generate AI images for each scene. Select reference images and edit prompts.
      </p>

      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Reference Images Library</p>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleReferenceUpload}
                className="hidden"
              />
              <Button size="sm" variant="outline" disabled={isUploadingReference}>
                {isUploadingReference ? 'Uploading...' : 'Upload Reference'}
              </Button>
            </label>
          </div>
          {referenceLibrary.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {referenceLibrary.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted">
                  <Image src={img.url} alt="Reference" fill sizes="100px" className="object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-subtle">No reference images yet</p>
          )}
        </div>

        {scenes.map((scene) => {
          const sceneImages = generatedImages.filter((img) => img.sceneId === scene.id);
          const regenerationCount = Math.max(0, sceneImages.length - 1);

          return (
            <div key={scene.id} className="rounded-xl border border-border bg-surface p-6">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {scene.sceneNumber}
                </span>
                <h3 className="font-semibold text-foreground">Scene {scene.sceneNumber}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Image Model
                  </label>
                  <select
                    value={modelByScene[scene.id] || 'flux-2-flex'}
                    onChange={(e) =>
                      setModelByScene((prev) => ({ ...prev, [scene.id]: e.target.value }))
                    }
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
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Image Prompt (max 300 chars)
                  </label>
                  <textarea
                    className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    rows={3}
                    maxLength={300}
                    value={scene.imagePrompt || scene.visualDescription}
                    onChange={(e) =>
                      setScenes((prev) =>
                        prev.map((s) =>
                          s.id === scene.id ? { ...s, imagePrompt: e.target.value } : s
                        )
                      )
                    }
                    onBlur={() =>
                      handleSavePrompt(scene, scene.imagePrompt || scene.visualDescription)
                    }
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-subtle">
                      {(scene.imagePrompt || scene.visualDescription).length} / 300
                    </span>
                    <Button size="sm" variant="outline" onClick={() => handleEnhancePrompt(scene)}>
                      Enhance
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Select Reference Images (up to 10)
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {referenceLibrary.map((img) => {
                      const selected = selectedReferences[scene.id]?.includes(img.url);
                      return (
                        <button
                          key={`${scene.id}-${img.id}`}
                          onClick={() => {
                            const current = selectedReferences[scene.id] || [];
                            const next = selected
                              ? current.filter((url) => url !== img.url)
                              : current.length < 10
                                ? [...current, img.url]
                                : current;
                            setSelectedReferences((prev) => ({ ...prev, [scene.id]: next }));
                          }}
                          className={`relative aspect-square overflow-hidden rounded-lg border-2 ${
                            selected ? 'border-brand' : 'border-border'
                          }`}
                        >
                          <Image src={img.url} alt="Reference" fill sizes="100px" className="object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => handleGenerateImage(scene)}
                    disabled={isGenerating === scene.id}
                  >
                    {isGenerating === scene.id ? 'Generating...' : 'Generate Image'}
                  </Button>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => handleCustomUpload(scene.id, event)}
                      disabled={isGenerating === scene.id}
                    />
                    <Button size="sm" variant="outline" disabled={isGenerating === scene.id}>
                      Upload Custom
                    </Button>
                  </label>
                  {regenerationCount > 0 && (
                    <span className="text-xs text-gray-500">
                      Regeneration {regenerationCount} (next costs 5 tokens)
                    </span>
                  )}
                </div>

                {sceneImages.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sceneImages.slice(0, 2).map((img) => (
                      <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                        <Image src={img.url} alt="Generated" fill sizes="200px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex gap-3">
          <Button onClick={onNext}>Continue to Video</Button>
        </div>
      </div>

      {feedbackForImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900">Image Feedback</h3>
            <p className="text-sm text-gray-600 mt-1">
              How can this image be improved for future generations?
            </p>
            <textarea
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              rows={4}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Optional feedback..."
            />
            <div className="mt-4 flex gap-3">
              <Button onClick={handleFeedbackSubmit}>Submit</Button>
              <Button variant="outline" onClick={() => setFeedbackForImage(null)}>
                Skip
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
