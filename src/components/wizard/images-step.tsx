'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useGenerateImages } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface ImagesStepProps {
  projectId: string;
  onNext: () => void;
}

interface ImageResult {
  sceneId: string;
  sceneNumber: number;
  asset: {
    id: string;
    url: string;
    metadata: any;
  };
}

export function ImagesStep({ projectId, onNext }: ImagesStepProps) {
  const [images, setImages] = useState<ImageResult[] | null>(null);
  const [style, setStyle] = useState<'photorealistic' | 'artistic' | 'cinematic' | 'product'>('photorealistic');
  
  const generateImages = useGenerateImages(projectId);

  const handleGenerate = async () => {
    const result = await generateImages.mutateAsync({ style });
    setImages(result.images);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Generate Images</h2>
      <p className="mt-2 text-gray-600">
        AI will create visuals for each scene
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Image Style
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['photorealistic', 'artistic', 'cinematic', 'product'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  style === s
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {!images && !generateImages.isPending && (
          <Button onClick={handleGenerate} size="lg">
            Generate Images
          </Button>
        )}

        {generateImages.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Generating images for all scenes..." />
            <p className="mt-4 text-sm text-gray-500">
              This may take a minute or two
            </p>
          </div>
        )}

        {images && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {images.map((image) => (
                <div
                  key={image.asset.id}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                      {image.sceneNumber}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      Scene {image.sceneNumber}
                    </span>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={image.asset.url}
                      alt={`Scene ${image.sceneNumber}`}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate}>
                Regenerate
              </Button>
              <Button onClick={onNext}>
                Continue to Video
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
