'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { ContextMenu, useContextMenu } from '@/components/ui/context-menu';
import toast from 'react-hot-toast';

interface Video {
  id: string;
  projectId: string;
  url: string;
  durationSeconds: number | null;
  resolution: string | null;
  createdAt: Date;
  project: {
    id: string;
    name: string;
  };
}

interface LibraryClientProps {
  organizationId?: string;
}

export function LibraryClient({ organizationId }: LibraryClientProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [contextVideoId, setContextVideoId] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);
  const contextMenu = useContextMenu();

  const fetchVideos = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await fetch(`/api/videos?organizationId=${organizationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleDownload = async (video: Video) => {
    setDownloadingId(video.id);
    try {
      const response = await fetch(`/api/videos/${video.id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download video');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${video.project.name}-${new Date(video.createdAt).toISOString().split('T')[0]}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Video downloaded successfully');
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Failed to download video');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRename = async () => {
    const video = videos.find((item) => item.id === contextVideoId);
    if (!video || !renameValue.trim()) {
      toast.error('Video name is required');
      return;
    }
    try {
      const response = await fetch(`/api/projects/${video.projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', name: renameValue.trim() }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rename video');
      }
      toast.success('Video renamed');
      setIsRenameModalOpen(false);
      fetchVideos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename video');
    }
  };

  const handleArchive = async () => {
    if (!contextVideoId) return;
    try {
      setIsArchiving(true);
      const response = await fetch(`/api/videos/${contextVideoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive video');
      }
      toast.success('Video archived');
      fetchVideos();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive video');
    } finally {
      setIsArchiving(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <Loading size="lg" text="Loading videos..." />
        </div>
      </main>
    );
  }

  if (!organizationId) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white">
          <p className="text-gray-600">Please select an organization to view videos</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Video Library</h1>
        <p className="mt-2 text-gray-600">
          View and download all your finished videos
        </p>
      </div>

      {videos.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white">
          <svg
            className="h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No videos yet</h3>
          <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
            Finished videos from your projects will appear here. Create a project and complete it to see videos in your library.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md"
              onContextMenu={(event) => {
                setContextVideoId(video.id);
                contextMenu.open(event);
              }}
            >
              {/* Video Thumbnail */}
              <div className="relative aspect-video bg-gray-100">
                <video
                  src={video.url}
                  className="h-full w-full object-cover"
                  preload="metadata"
                  muted
                >
                  Your browser does not support the video tag.
                </video>
                {/* Duration Overlay */}
                {video.durationSeconds && (
                  <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
                    {formatDuration(video.durationSeconds)}
                  </div>
                )}
                {/* Resolution Badge */}
                {video.resolution && (
                  <div className="absolute top-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
                    {video.resolution}
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="p-4">
                <h3 className="mb-1 text-sm font-semibold text-gray-900 line-clamp-2">
                  {video.project.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {new Date(video.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>

                {/* Download Button */}
                <Button
                  onClick={() => handleDownload(video)}
                  isLoading={downloadingId === video.id}
                  className="mt-3 w-full"
                  size="sm"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ContextMenu
        items={[
          {
            id: 'rename',
            label: 'Rename',
            onSelect: () => {
              const video = videos.find((item) => item.id === contextVideoId);
              if (!video) return;
              setRenameValue(video.project.name);
              setIsRenameModalOpen(true);
            },
          },
          {
            id: 'export',
            label: 'Export',
            onSelect: () => {
              const video = videos.find((item) => item.id === contextVideoId);
              if (video) {
                handleDownload(video);
              }
            },
          },
          {
            id: 'archive',
            label: isArchiving ? 'Archiving...' : 'Archive',
            tone: 'danger',
            disabled: isArchiving,
            onSelect: handleArchive,
          },
        ]}
        position={contextMenu.position}
        onClose={contextMenu.close}
      />

      <Modal
        isOpen={isRenameModalOpen}
        onClose={() => {
          setIsRenameModalOpen(false);
        }}
        title="Rename Video"
      >
        <div className="space-y-4">
          <Input
            label="Video Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Enter video name"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
