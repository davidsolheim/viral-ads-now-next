'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface MusicStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

interface MusicTrack {
  id: string;
  name: string;
  url: string;
  durationSeconds?: number;
  category?: string;
}

interface MediaAsset {
  id: string;
  url: string;
  metadata?: any;
}

export function MusicStep({ projectId, onNext, readOnly = false }: MusicStepProps) {
  const [activeTab, setActiveTab] = useState<'preset' | 'library' | 'generate'>('preset');
  const [presetTracks, setPresetTracks] = useState<MusicTrack[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<MediaAsset[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState<'lyra-2' | 'stable-audio-2-5'>('lyra-2');
  const [volume, setVolume] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadMusic = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/music`);
        if (response.ok) {
          const data = await response.json();
          setPresetTracks(data.presetTracks || []);
          setLibraryAssets(data.libraryAssets || []);
        }
      } catch (error) {
        console.error('Error loading music:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMusic();
  }, [projectId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload =
        activeTab === 'preset'
          ? { mode: 'preset', trackId: selectedTrackId, volume }
          : activeTab === 'library'
            ? { mode: 'library', assetId: selectedAssetId, volume }
            : { mode: 'generate', prompt, model, volume };

      const response = await fetch(`/api/projects/${projectId}/music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save music');
      const result = await response.json();
      setPreviewUrl(result.music?.url || null);
      toast.success('Music saved!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save music');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading music..." />
      </div>
    );
  }

  if (readOnly) {
    const latestAsset = libraryAssets[0];
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">Background Music</h2>
        <p className="mt-2 text-muted">AI selected background music.</p>
        <div className="mt-6">
          {latestAsset?.url ? (
            <audio controls className="w-full">
              <source src={latestAsset.url} />
            </audio>
          ) : (
            <p className="text-sm text-muted">No music available yet.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">Background Music</h2>
      <p className="mt-2 text-gray-600">
        Choose a preset track, use your library, or generate custom music.
      </p>

      <div className="mt-6 space-y-6">
        <div className="flex gap-2">
          <Button variant={activeTab === 'preset' ? 'primary' : 'outline'} onClick={() => setActiveTab('preset')}>
            Preset Music
          </Button>
          <Button variant={activeTab === 'library' ? 'primary' : 'outline'} onClick={() => setActiveTab('library')}>
            My Library
          </Button>
          <Button variant={activeTab === 'generate' ? 'primary' : 'outline'} onClick={() => setActiveTab('generate')}>
            Generate Custom
          </Button>
        </div>

        {activeTab === 'preset' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {presetTracks.map((track) => (
              <button
                key={track.id}
                onClick={() => {
                  setSelectedTrackId(track.id);
                  setPreviewUrl(track.url);
                }}
                className={`rounded-lg border p-3 text-left ${
                  selectedTrackId === track.id ? 'border-brand bg-brand-50' : 'border-border bg-white'
                }`}
              >
                <p className="text-sm font-medium text-foreground">{track.name}</p>
                {track.category && <p className="text-xs text-subtle">{track.category}</p>}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'library' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {libraryAssets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => {
                  setSelectedAssetId(asset.id);
                  setPreviewUrl(asset.url);
                }}
                className={`rounded-lg border p-3 text-left ${
                  selectedAssetId === asset.id ? 'border-brand bg-brand-50' : 'border-border bg-white'
                }`}
              >
                <p className="text-sm font-medium text-foreground">Library Track</p>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Model
              </label>
              <select value={model} onChange={(e) => setModel(e.target.value as any)} className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
                <option value="lyra-2">Lyra-2 (30s)</option>
                <option value="stable-audio-2-5">Stable Audio 2.5 (up to 190s)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Prompt
              </label>
              <textarea
                className="w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the mood, instruments, style..."
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Music Volume: {volume}%
          </label>
          <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full" />
        </div>

        {previewUrl && (
          <audio controls className="w-full">
            <source src={previewUrl} />
          </audio>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Continue to Captions'}
          </Button>
        </div>
      </div>
    </div>
  );
}
