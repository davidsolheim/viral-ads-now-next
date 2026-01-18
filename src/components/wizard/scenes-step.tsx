'use client';

import { useState } from 'react';
import { useGenerateScenes } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface ScenesStepProps {
  projectId: string;
  onNext: () => void;
}

interface Scene {
  id: string;
  sceneNumber: number;
  scriptText: string;
  visualDescription: string;
}

export function ScenesStep({ projectId, onNext }: ScenesStepProps) {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [targetScenes, setTargetScenes] = useState(4);
  
  const generateScenes = useGenerateScenes(projectId);

  const handleGenerate = async () => {
    const result = await generateScenes.mutateAsync({ targetScenes });
    setScenes(result.scenes);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Break into Scenes</h2>
      <p className="mt-2 text-gray-600">
        AI will break your script into visual scenes
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Number of Scenes: {targetScenes}
          </label>
          <input
            type="range"
            min="2"
            max="8"
            value={targetScenes}
            onChange={(e) => setTargetScenes(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>2 scenes</span>
            <span>8 scenes</span>
          </div>
        </div>

        {!scenes && !generateScenes.isPending && (
          <Button onClick={handleGenerate} size="lg">
            Generate Scenes
          </Button>
        )}

        {generateScenes.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Breaking script into scenes..." />
          </div>
        )}

        {scenes && (
          <div className="space-y-4">
            <div className="space-y-4">
              {scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="rounded-lg border border-gray-200 bg-white p-6"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                      {scene.sceneNumber}
                    </span>
                    <h3 className="font-semibold text-gray-900">
                      Scene {scene.sceneNumber}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Script:</p>
                      <p className="mt-1 text-gray-600">{scene.scriptText}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Visual:</p>
                      <p className="mt-1 text-gray-600">{scene.visualDescription}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate}>
                Regenerate
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
