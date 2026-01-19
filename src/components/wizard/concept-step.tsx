'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface ConceptStepProps {
  projectId: string;
  onNext: () => void;
  flowType?: 'manual' | 'automatic';
}

interface Concept {
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

export function ConceptStep({ projectId, onNext, flowType = 'manual' }: ConceptStepProps) {
  const [concepts, setConcepts] = useState<Concept[] | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  useEffect(() => {
    // Load existing concepts if they exist
    const loadConcepts = async () => {
      let attempts = 0;
      const maxAttempts = 30; // Poll for up to 30 seconds

      const poll = async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/concepts`);
          if (response.ok) {
            const data = await response.json();
            if (data.concepts && data.concepts.length > 0) {
              setConcepts(data.concepts);
              setIsLoading(false);
              return;
            }
          }

          // If no concepts yet and we haven't exceeded max attempts, poll again
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 1000); // Poll every second
          } else {
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error loading concepts:', error);
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

    loadConcepts();
  }, [projectId]);

  const handleSelectConcept = async (conceptId: string) => {
    if (isSelecting) return;

    setIsSelecting(true);
    try {
      const response = await fetch(
        `/api/projects/${projectId}/concepts/${conceptId}/select`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to select concept');
      }

      setSelectedConceptId(conceptId);

      if (flowType === 'automatic') {
        // Automatic flow: trigger auto-generate and proceed to compile
        setIsAutoGenerating(true);
        toast.success('Concept selected! Generating video automatically...');
        
        const autoGenerateResponse = await fetch(`/api/projects/${projectId}/auto-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (!autoGenerateResponse.ok) {
          const error = await autoGenerateResponse.json();
          throw new Error(error.error || 'Failed to auto-generate video');
        }

        const result = await autoGenerateResponse.json();
        toast.success('Video generation completed!');
        
        // Refresh project to get updated step
        const projectResponse = await fetch(`/api/projects/${projectId}`);
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          // Auto-generate should have updated step to 'compile'
          // Navigate to compile step
          onNext(); // Proceed to compile step
        } else {
          onNext(); // Fallback: proceed anyway
        }
      } else {
        // Manual flow: proceed to script step
        toast.success('Concept selected!');
        onNext();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to select concept');
    } finally {
      setIsSelecting(false);
      setIsAutoGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Generating concepts..." />
        <p className="mt-4 text-sm text-subtle">
          Creating 3 unique concepts with scripts, scenes, and preview images...
        </p>
      </div>
    );
  }

  if (isAutoGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Generating video automatically..." />
        <p className="mt-4 text-sm text-subtle">
          Creating images, voiceover, and finalizing your video. This may take a few minutes.
        </p>
      </div>
    );
  }

  if (!concepts || concepts.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Concepts</h2>
        <p className="mt-2 text-muted">
          No concepts found. Please go back and generate them first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Choose Your Concept</h2>
      <p className="mt-2 text-muted">
        Select one of the three concepts below. Each includes a script, scene breakdown, and preview images.
        {flowType === 'automatic' && (
          <span className="mt-1 block text-sm text-brand">
            After selection, your video will be generated automatically.
          </span>
        )}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {concepts.map((concept) => (
          <div
            key={concept.id}
            className={`rounded-lg border-2 p-6 transition-all ${
              selectedConceptId === concept.id
                ? 'border-brand bg-brand-50'
                : 'border-border bg-white hover:border-border-strong'
            } ${isSelecting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                Concept {concepts.indexOf(concept) + 1}
              </h3>
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-muted">Script:</p>
                <div className="max-h-32 overflow-y-auto rounded-md bg-surface-muted p-3">
                  <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
                    {concept.script}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-muted">
                {concept.scenes.length} Scenes
              </p>
              <div className="grid grid-cols-2 gap-2">
                {concept.scenes.map((scene) => (
                  <div
                    key={scene.sceneId}
                    className="relative aspect-square overflow-hidden rounded-lg bg-surface-muted"
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
              onClick={() => handleSelectConcept(concept.id)}
              disabled={isSelecting || selectedConceptId === concept.id}
              className="w-full"
              variant={selectedConceptId === concept.id ? 'primary' : 'outline'}
            >
              {selectedConceptId === concept.id
                ? 'Selected'
                : isSelecting
                ? 'Selecting...'
                : 'Select This Concept'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
