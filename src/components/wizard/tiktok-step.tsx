'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';

interface TikTokStepProps {
  projectId: string;
  onNext: () => void;
  readOnly?: boolean;
}

export function TikTokStep({ projectId, onNext, readOnly = false }: TikTokStepProps) {
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState<string[]>(['', '', '', '', '']);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const loadMetadata = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tiktok-metadata`);
      if (response.ok) {
        const data = await response.json();
        if (data.tiktok) {
          setDescription(data.tiktok.description || '');
          setHashtags(data.tiktok.hashtags || ['', '', '', '', '']);
          setKeywords(data.tiktok.keywords || []);
          return;
        }
      }
      await generateMetadata();
    } catch (error) {
      console.error('Error loading metadata:', error);
    }
  };

  const loadVideo = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/video`);
      if (response.ok) {
        const data = await response.json();
        const firstVideo = data.videos?.[0];
        if (firstVideo) setVideoUrl(firstVideo.url);
      }
    } catch (error) {
      console.error('Error loading video:', error);
    }
  };

  useEffect(() => {
    Promise.all([loadMetadata(), loadVideo()]).finally(() => setIsLoading(false));
  }, [projectId]);

  const generateMetadata = async () => {
    const response = await fetch(`/api/projects/${projectId}/tiktok-metadata`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to generate metadata');
    const data = await response.json();
    setDescription(data.tiktok.description || '');
    setHashtags(data.tiktok.hashtags || ['', '', '', '', '']);
    setKeywords(data.tiktok.keywords || []);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tiktok-metadata`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          hashtags,
          keywords,
        }),
      });
      if (!response.ok) throw new Error('Failed to save metadata');
      toast.success('TikTok metadata saved!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save metadata');
    }
  };

  const handleComplete = async () => {
    try {
      await handleSave();
      const response = await fetch(`/api/projects/${projectId}/complete`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to complete project');
      toast.success('Project completed!');
      onNext();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete project');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loading size="lg" text="Loading TikTok metadata..." />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-foreground">TikTok Metadata</h2>
        <p className="mt-2 text-muted">AI generated the TikTok copy.</p>
        <div className="mt-6 space-y-4">
          {videoUrl && (
            <video controls className="w-full rounded-lg">
              <source src={videoUrl} />
            </video>
          )}
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm font-medium text-foreground">Description</div>
            <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">{description || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm font-medium text-foreground">Hashtags</div>
            <p className="mt-2 text-sm text-foreground">{hashtags.filter(Boolean).join(' ') || '—'}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="text-sm font-medium text-foreground">Keywords</div>
            <p className="mt-2 text-sm text-foreground">{keywords.filter(Boolean).join(', ') || '—'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900">TikTok Metadata</h2>
      <p className="mt-2 text-gray-600">Prepare your TikTok description, hashtags, and keywords.</p>

      <div className="mt-6 space-y-6">
        {videoUrl && (
          <video controls className="w-full rounded-lg">
            <source src={videoUrl} />
          </video>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-900">Description (max 150 chars)</label>
            <Button size="sm" variant="outline" onClick={generateMetadata}>
              Regenerate
            </Button>
          </div>
          <textarea
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            rows={2}
            maxLength={150}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-900">Hashtags (exactly 5)</label>
            <Button size="sm" variant="outline" onClick={generateMetadata}>
              Regenerate
            </Button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {hashtags.map((tag, index) => (
              <input
                key={index}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={tag}
                onChange={(e) => {
                  const next = [...hashtags];
                  next[index] = e.target.value;
                  setHashtags(next);
                }}
                placeholder="#hashtag"
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-900">Keywords (5-8)</label>
            <Button size="sm" variant="outline" onClick={generateMetadata}>
              Regenerate
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <input
                key={index}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={keyword}
                onChange={(e) => {
                  const next = [...keywords];
                  next[index] = e.target.value;
                  setKeywords(next);
                }}
                placeholder="keyword"
              />
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setKeywords((prev) => [...prev, ''])}
              disabled={keywords.length >= 8}
            >
              Add Keyword
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave}>Save</Button>
          <Button onClick={handleComplete}>Complete Project</Button>
        </div>
      </div>
    </div>
  );
}
