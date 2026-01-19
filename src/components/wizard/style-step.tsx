'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useGenerateConcepts } from '@/hooks/use-projects';

type AdStyle = 'conversational' | 'energetic' | 'professional' | 'casual' | 'sex_appeal';
type AspectRatio = 'portrait' | 'landscape' | 'square';

interface StyleStepProps {
  projectId: string;
  onNext: () => void;
}

const styles: Array<{ id: AdStyle; name: string; description: string }> = [
  {
    id: 'conversational',
    name: 'Conversational',
    description: 'Friendly, natural dialogue style',
  },
  {
    id: 'energetic',
    name: 'Energetic',
    description: 'High-energy, exciting presentation',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Polished, business-focused tone',
  },
  {
    id: 'casual',
    name: 'Casual',
    description: 'Relaxed, approachable style',
  },
  {
    id: 'sex_appeal',
    name: 'Sex Appeal',
    description: 'Alluring, captivating presentation',
  },
];

export function StyleStep({ projectId, onNext }: StyleStepProps) {
  const [selectedStyle, setSelectedStyle] = useState<AdStyle | null>(null);
  const [duration, setDuration] = useState(30);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('portrait');
  const generateConcepts = useGenerateConcepts(projectId);

  const handleGenerate = async () => {
    if (!selectedStyle) {
      toast.error('Please select a style first');
      return;
    }

    try {
      await generateConcepts.mutateAsync({
        style: selectedStyle,
        duration,
        aspectRatio,
      });
      toast.success('Concepts generated successfully!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate concepts');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Choose Your Style</h2>
      <p className="mt-2 text-muted">
        Select an advertisement style, duration, and aspect ratio. We'll generate 3 concepts for you to choose from.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="mb-4 block text-sm font-medium text-foreground">
            Advertisement Style
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                disabled={generateConcepts.isPending}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  selectedStyle === style.id
                    ? 'border-brand bg-brand-50'
                    : 'border-border bg-white hover:border-border-strong'
                } ${generateConcepts.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <h3 className="text-lg font-semibold text-foreground">{style.name}</h3>
                <p className="mt-1 text-sm text-muted">{style.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-4 block text-sm font-medium text-foreground">
            Duration
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[15, 30, 60].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setDuration(seconds)}
                disabled={generateConcepts.isPending}
                className={`rounded-lg border-2 p-4 text-center transition-colors ${
                  duration === seconds
                    ? 'border-brand bg-brand-50'
                    : 'border-border bg-white hover:border-border-strong'
                } ${generateConcepts.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <h3 className="text-lg font-semibold text-foreground">{seconds}s</h3>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-4 block text-sm font-medium text-foreground">
            Aspect Ratio
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'portrait' as AspectRatio, name: 'Portrait', ratio: '9:16' },
              { id: 'landscape' as AspectRatio, name: 'Landscape', ratio: '16:9' },
              { id: 'square' as AspectRatio, name: 'Square', ratio: '1:1' },
            ].map((ratio) => (
              <button
                key={ratio.id}
                onClick={() => setAspectRatio(ratio.id)}
                disabled={generateConcepts.isPending}
                className={`rounded-lg border-2 p-4 text-center transition-colors ${
                  aspectRatio === ratio.id
                    ? 'border-brand bg-brand-50'
                    : 'border-border bg-white hover:border-border-strong'
                } ${generateConcepts.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <h3 className="text-lg font-semibold text-foreground">{ratio.name}</h3>
                <p className="mt-1 text-sm text-muted">{ratio.ratio}</p>
              </button>
            ))}
          </div>
        </div>

        {generateConcepts.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Generating concepts..." />
            <p className="mt-4 text-sm text-subtle">
              This may take a few minutes. We're creating 3 unique concepts with scripts, scenes, and preview images.
            </p>
          </div>
        )}

        {!generateConcepts.isPending && (
          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={!selectedStyle}
              size="lg"
              className="w-full sm:w-auto"
            >
              Generate Concepts
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
