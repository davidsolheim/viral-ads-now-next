'use client';

import { useState } from 'react';
import { useGenerateVoiceover } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface VoiceoverStepProps {
  projectId: string;
  onNext: () => void;
}

export function VoiceoverStep({ projectId, onNext }: VoiceoverStepProps) {
  const [voiceover, setVoiceover] = useState<{ url: string } | null>(null);
  const [voice, setVoice] = useState<'male-1' | 'male-2' | 'female-1' | 'female-2' | 'female-3'>('female-1');
  const [speed, setSpeed] = useState(1.0);
  
  const generateVoiceover = useGenerateVoiceover(projectId);

  const handleGenerate = async () => {
    const result = await generateVoiceover.mutateAsync({ voice, speed });
    setVoiceover(result.voiceover);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Generate Voiceover</h2>
      <p className="mt-2 text-gray-600">
        Choose a voice and generate AI voiceover for your script
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Voice
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(['male-1', 'male-2', 'female-1', 'female-2', 'female-3'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVoice(v)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  voice === v
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {v.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speed: {speed}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>0.5x (Slower)</span>
            <span>2.0x (Faster)</span>
          </div>
        </div>

        {!voiceover && !generateVoiceover.isPending && (
          <Button onClick={handleGenerate} size="lg">
            Generate Voiceover
          </Button>
        )}

        {generateVoiceover.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Generating voiceover..." />
            <p className="mt-4 text-sm text-gray-500">
              This may take a minute
            </p>
          </div>
        )}

        {voiceover && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Voiceover Generated
              </h3>
              <audio controls className="w-full">
                <source src={voiceover.url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate}>
                Regenerate
              </Button>
              <Button onClick={onNext}>
                Continue to Music
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
