'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useGenerateStoryboards } from '@/hooks/use-projects';

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
  const generateStoryboards = useGenerateStoryboards(projectId);

  const handleGenerate = async () => {
    if (!selectedStyle) {
      toast.error('Please select a style first');
      return;
    }

    try {
      await generateStoryboards.mutateAsync({
        style: selectedStyle,
        duration,
        aspectRatio,
      });
      toast.success('Storyboards generated successfully!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate storyboards');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Choose Your Style</h2>
      <p className="mt-2 text-gray-600">
        Select an advertisement style, duration, and aspect ratio. We'll generate 3 storyboards for you to choose from.
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-4">
            Advertisement Style
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {styles.map((style) => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                disabled={generateStoryboards.isPending}
                className={`rounded-lg border-2 p-4 text-left transition-colors ${
                  selectedStyle === style.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                } ${generateStoryboards.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <h3 className="text-lg font-semibold text-gray-900">{style.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{style.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-4">
            Duration
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[15, 30, 60].map((seconds) => (
              <button
                key={seconds}
                onClick={() => setDuration(seconds)}
                disabled={generateStoryboards.isPending}
                className={`rounded-lg border-2 p-4 text-center transition-colors ${
                  duration === seconds
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                } ${generateStoryboards.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <h3 className="text-lg font-semibold text-gray-900">{seconds}s</h3>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-4">
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
                disabled={generateStoryboards.isPending}
                className={`rounded-lg border-2 p-4 text-center transition-colors ${
                  aspectRatio === ratio.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                } ${generateStoryboards.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <h3 className="text-lg font-semibold text-gray-900">{ratio.name}</h3>
                <p className="mt-1 text-sm text-gray-600">{ratio.ratio}</p>
              </button>
            ))}
          </div>
        </div>

        {generateStoryboards.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Generating storyboards..." />
            <p className="mt-4 text-sm text-gray-500">
              This may take a few minutes. We're creating 3 unique storyboards with scripts, scenes, and preview images.
            </p>
          </div>
        )}

        {!generateStoryboards.isPending && (
          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={!selectedStyle}
              size="lg"
              className="w-full sm:w-auto"
            >
              Generate Storyboards
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
