'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface StoryboardStepProps {
  projectId: string;
  onNext: () => void;
}

interface Storyboard {
  id: string;
  script: string;
  scenes: Array<{
    sceneId: string;
    sceneNumber: number;
    scriptText: string;
    visualDescription: string;
    previewImageUrl: string;
  }>;
}

export function StoryboardStep({ projectId, onNext }: StoryboardStepProps) {
  const [storyboards, setStoryboards] = useState<Storyboard[] | null>(null);
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    // Load existing storyboards if they exist
    const loadStoryboards = async () => {
      let attempts = 0;
      const maxAttempts = 30; // Poll for up to 30 seconds

      const poll = async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/storyboards`);
          if (response.ok) {
            const data = await response.json();
            if (data.storyboards && data.storyboards.length > 0) {
              setStoryboards(data.storyboards);
              setIsLoading(false);
              return;
            }
          }

          // If no storyboards yet and we haven't exceeded max attempts, poll again
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000); // Poll every second
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error loading storyboards:', error);
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000);
          } else {
            setIsLoading(false);
          }
        }
      };

      poll();
    };

    loadStoryboards();
  }, [projectId]);

  const handleSelectStoryboard = async (storyboardId: string) => {
    if (isSelecting) return;

    setIsSelecting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/storyboards/${storyboardId}/select`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to select storyboard');
      }

      toast.success('Storyboard selected! Generating final video...');
      setSelectedStoryboardId(storyboardId);
      
      // Trigger auto-generate continuation (no style needed, it's already set)
      const autoGenerateResponse = await fetch(`/api/projects/${projectId}/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!autoGenerateResponse.ok) {
        const error = await autoGenerateResponse.json();
        throw new Error(error.error || 'Failed to continue generation');
      }

      const result = await autoGenerateResponse.json();
      toast.success('Video generation completed!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to select storyboard');
    } finally {
      setIsSelecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Generating storyboards..." />
        <p className="mt-4 text-sm text-gray-500">
          Creating 3 unique storyboards with scripts, scenes, and preview images...
        </p>
      </div>
    );
  }

  if (!storyboards || storyboards.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Storyboards</h2>
        <p className="mt-2 text-gray-600">
          No storyboards found. Please go back and generate them first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Choose Your Storyboard</h2>
      <p className="mt-2 text-gray-600">
        Select one of the three storyboards below. Each includes a script, scene breakdown, and preview images.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {storyboards.map((storyboard) => (
          <div
            key={storyboard.id}
            className={`rounded-lg border-2 p-6 transition-all ${
              selectedStoryboardId === storyboard.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            } ${isSelecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Storyboard {storyboards.indexOf(storyboard) + 1}
              </h3>
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-700 mb-1">Script:</p>
                <div className="max-h-32 overflow-y-auto rounded-md bg-gray-50 p-3">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {storyboard.script}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-gray-700 mb-2">
                {storyboard.scenes.length} Scenes
              </p>
              <div className="grid grid-cols-2 gap-2">
                {storyboard.scenes.map((scene) => (
                  <div
                    key={scene.sceneId}
                    className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
                  >
                    <img
                      src={scene.previewImageUrl}
                      alt={`Scene ${scene.sceneNumber}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                      <p className="text-xs text-white font-medium">
                        Scene {scene.sceneNumber}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={() => handleSelectStoryboard(storyboard.id)}
              disabled={isSelecting || selectedStoryboardId === storyboard.id}
              className="w-full"
              variant={selectedStoryboardId === storyboard.id ? 'default' : 'outline'}
            >
              {selectedStoryboardId === storyboard.id
                ? 'Selected'
                : isSelecting
                ? 'Selecting...'
                : 'Select This Storyboard'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
