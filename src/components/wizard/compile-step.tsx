'use client';

import { useState } from 'react';
import { useCompileVideo } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface CompileStepProps {
  projectId: string;
  onNext: () => void;
}

export function CompileStep({ projectId, onNext }: CompileStepProps) {
  const [video, setVideo] = useState<{ url: string } | null>(null);
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p' | '4k'>('1080p');
  const [includeCaptions, setIncludeCaptions] = useState(true);
  
  const compileVideo = useCompileVideo(projectId);

  const handleCompile = async () => {
    const result = await compileVideo.mutateAsync({
      resolution,
      includeCaptions,
      musicVolume: 0.3,
    });
    setVideo(result.video);
    onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Compile Video</h2>
      <p className="mt-2 text-gray-600">
        Finalize your settings and compile the video
      </p>

      <div className="mt-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resolution
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(['480p', '720p', '1080p', '4k'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setResolution(r)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors ${
                  resolution === r
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="captions"
            checked={includeCaptions}
            onChange={(e) => setIncludeCaptions(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="captions" className="text-sm font-medium text-gray-700">
            Include captions
          </label>
        </div>

        {!video && !compileVideo.isPending && (
          <Button onClick={handleCompile} size="lg">
            Compile Video
          </Button>
        )}

        {compileVideo.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Compiling your video..." />
            <p className="mt-4 text-sm text-gray-500">
              This may take several minutes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
