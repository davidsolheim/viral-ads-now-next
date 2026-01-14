'use client';

import { useState } from 'react';
import { useGenerateScript } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface ScriptStepProps {
  projectId: string;
  onNext: () => void;
}

export function ScriptStep({ projectId, onNext }: ScriptStepProps) {
  const [script, setScript] = useState<string | null>(null);
  const [style, setStyle] = useState<'conversational' | 'energetic' | 'professional' | 'casual'>('conversational');
  
  const generateScript = useGenerateScript(projectId);

  const handleGenerate = async () => {
    const result = await generateScript.mutateAsync({ style });
    setScript(result.script.content);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Generate Script</h2>
      <p className="mt-2 text-gray-600">
        Choose a style and let AI create your ad script
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Script Style
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['conversational', 'energetic', 'professional', 'casual'] as const).map((s) => (
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

        {!script && !generateScript.isPending && (
          <Button onClick={handleGenerate} size="lg">
            Generate Script
          </Button>
        )}

        {generateScript.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Generating your script..." />
          </div>
        )}

        {script && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">
                Generated Script
              </h3>
              <p className="whitespace-pre-wrap text-gray-700">{script}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate}>
                Regenerate
              </Button>
              <Button onClick={onNext}>
                Continue to Scenes
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
