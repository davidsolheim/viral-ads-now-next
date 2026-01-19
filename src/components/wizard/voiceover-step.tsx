'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useGenerateVoiceover } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface VoiceoverStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

const PRESET_VOICES = [
  'female-1', 'female-2', 'female-3', 'female-4', 'female-5',
  'male-1', 'male-2', 'male-3', 'male-4', 'male-5',
  'female-british', 'male-british', 'female-australian', 'male-australian',
  'female-indian', 'male-indian', 'female-spanish', 'male-spanish',
  'female-french', 'male-french', 'female-german', 'male-german',
  'female-italian', 'male-italian', 'female-japanese', 'male-japanese',
  'female-korean', 'male-korean', 'female-chinese', 'male-chinese',
  'female-energetic', 'male-energetic', 'female-calm', 'male-calm',
  'female-professional', 'male-professional', 'female-casual', 'male-casual',
  'female-storyteller', 'male-storyteller',
];

export function VoiceoverStep({ projectId, onNext, readOnly = false }: VoiceoverStepProps) {
  const [voiceover, setVoiceover] = useState<{ url: string } | null>(null);
  const [voice, setVoice] = useState<string>('female-1');
  const [speed, setSpeed] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(80);
  const [emotion, setEmotion] = useState<'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised'>('neutral');
  const [activeTab, setActiveTab] = useState<'preset' | 'clone' | 'upload'>('preset');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cloneSampleUrl, setCloneSampleUrl] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isLoading, setIsLoading] = useState(readOnly);

  const generateVoiceover = useGenerateVoiceover(projectId);

  useEffect(() => {
    if (!readOnly) return;
    const loadVoiceover = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/voiceover`);
        if (response.ok) {
          const data = await response.json();
          const first = data.voiceovers?.[0];
          if (first?.url) {
            setVoiceover({ url: first.url });
          }
        }
      } catch (error) {
        console.error('Error loading voiceover:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVoiceover();
  }, [projectId, readOnly]);

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/voiceover/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice, speed, pitch, volume, emotion }),
      });

      if (!response.ok) throw new Error('Failed to generate preview');
      const result = await response.json();
      setPreviewUrl(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to preview voice');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    const result = await generateVoiceover.mutateAsync({
      voice,
      speed,
      pitch,
      volume,
      emotion,
      voiceType: activeTab === 'clone' ? 'clone' : 'preset',
      cloneSampleUrl: cloneSampleUrl || undefined,
    });
    setVoiceover(result.voiceover);
  };

  const handleCloneUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const response = await fetch(`/api/projects/${projectId}/voiceover/clone`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload clone sample');
      const result = await response.json();
      setCloneSampleUrl(result.sample?.url || null);
      toast.success('Clone sample uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload sample');
    } finally {
      event.target.value = '';
    }
  };

  const handleCustomUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('audio', file);
      const response = await fetch(`/api/projects/${projectId}/voiceover/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload voiceover');
      const result = await response.json();
      setVoiceover(result.voiceover);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload voiceover');
    } finally {
      event.target.value = '';
    }
  };

  if (readOnly) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loading size="lg" text="Loading voiceover..." />
        </div>
      );
    }
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Voiceover</h2>
        <p className="mt-2 text-muted">AI generated the voiceover track.</p>
        <div className="mt-6">
          {voiceover?.url ? (
            <audio controls className="w-full">
              <source src={voiceover.url} type="audio/mpeg" />
            </audio>
          ) : (
            <p className="text-sm text-muted">No voiceover available yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Voiceover</h2>
      <p className="mt-2 text-gray-600">
        Choose a voice, preview, and generate voiceover for your script.
      </p>

      <div className="mt-6 space-y-6">
        <div className="flex gap-2">
          <Button variant={activeTab === 'preset' ? 'primary' : 'outline'} onClick={() => setActiveTab('preset')}>
            Preset Voices
          </Button>
          <Button variant={activeTab === 'clone' ? 'primary' : 'outline'} onClick={() => setActiveTab('clone')}>
            Clone Voice
          </Button>
          <Button variant={activeTab === 'upload' ? 'primary' : 'outline'} onClick={() => setActiveTab('upload')}>
            Upload Custom
          </Button>
        </div>

        {activeTab === 'preset' && (
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Voice</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PRESET_VOICES.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVoice(v)}
                    className={`rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors ${
                      voice === v ? 'border-brand bg-brand-50 text-brand-700' : 'border-border bg-white text-muted hover:border-border-strong'
                    }`}
                  >
                    {v.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Speed: {speed}x</label>
                <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Pitch: {pitch}</label>
                <input type="range" min="-12" max="12" step="1" value={pitch} onChange={(e) => setPitch(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Volume: {volume}</label>
                <input type="range" min="0" max="100" step="1" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Emotion</label>
                <select value={emotion} onChange={(e) => setEmotion(e.target.value as any)} className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
                  {['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'].map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handlePreview} disabled={isPreviewing}>
                {isPreviewing ? 'Generating...' : 'Preview (5s)'}
              </Button>
              {previewUrl && (
                <audio controls className="w-full">
                  <source src={previewUrl} type="audio/mpeg" />
                </audio>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clone' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Upload a 10–30 second sample to clone the voice.</p>
            <input type="file" accept="audio/*" onChange={handleCloneUpload} />
            {cloneSampleUrl && <p className="text-sm text-green-600">Sample uploaded.</p>}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Upload your pre-recorded voiceover file.</p>
            <input type="file" accept="audio/*" onChange={handleCustomUpload} />
          </div>
        )}

        {!voiceover && !generateVoiceover.isPending && activeTab !== 'upload' && (
          <Button onClick={handleGenerate} size="lg">
            Generate Voiceover
          </Button>
        )}

        {generateVoiceover.isPending && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loading size="lg" text="Generating voiceover..." />
            <p className="mt-4 text-sm text-subtle">This may take a minute</p>
          </div>
        )}

        {voiceover && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-6">
              <h3 className="mb-3 text-lg font-semibold text-foreground">Voiceover Ready</h3>
              <audio controls className="w-full">
                <source src={voiceover.url} type="audio/mpeg" />
              </audio>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleGenerate}>
                Regenerate
              </Button>
              <Button onClick={onNext}>Continue to Music</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
