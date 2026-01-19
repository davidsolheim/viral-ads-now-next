'use client';

import { useEffect, useState } from 'react';

interface AutoGenerateStreamPayload {
  step?: string;
  status?: string;
  message?: string;
  totalScenes?: number;
  completedImages?: number;
  completedVideos?: number;
  hasVoiceover?: boolean;
  updatedAt?: string;
}

export function useAutoGenerateStream(projectId: string, enabled: boolean) {
  const [data, setData] = useState<AutoGenerateStreamPayload | null>(null);
  const [eventId, setEventId] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const source = new EventSource(`/api/projects/${projectId}/auto-generate/stream`);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        setData(payload);
        setEventId((prev) => prev + 1);
      } catch (error) {
        console.error('Failed to parse auto-generate stream payload', error);
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [projectId, enabled]);

  return { data, eventId };
}
