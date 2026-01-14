import { useMutation, useQuery, useQueryClient } from '@tantml:parameter>react-query';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  organizationId: string;
  creatorId: string;
  currentStep: string;
  settings: any;
  createdAt: Date;
  updatedAt: Date | null;
}

interface CreateProjectData {
  name: string;
  organizationId: string;
}

export function useProjects(organizationId?: string) {
  return useQuery({
    queryKey: ['projects', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const response = await fetch(`/api/projects?organizationId=${organizationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const data = await response.json();
      return data.projects as Project[];
    },
    enabled: !!organizationId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectData) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create project');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateScript(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: {
      style?: 'conversational' | 'energetic' | 'professional' | 'casual';
      duration?: number;
      platform?: 'tiktok' | 'instagram' | 'youtube';
    }) => {
      const response = await fetch(`/api/projects/${projectId}/script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate script');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Script generated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateScenes(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: {
      scriptId?: string;
      targetScenes?: number;
    }) => {
      const response = await fetch(`/api/projects/${projectId}/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate scenes');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Scenes generated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateImages(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: {
      style?: 'photorealistic' | 'artistic' | 'cinematic' | 'product';
    }) => {
      const response = await fetch(`/api/projects/${projectId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate images');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Images generated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useGenerateVoiceover(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: {
      scriptId?: string;
      voice?: 'male-1' | 'male-2' | 'female-1' | 'female-2' | 'female-3';
      speed?: number;
      pitch?: number;
      volume?: number;
      emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'fearful' | 'disgusted' | 'surprised';
    }) => {
      const response = await fetch(`/api/projects/${projectId}/voiceover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate voiceover');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Voiceover generated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCompileVideo(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options?: {
      musicVolume?: number;
      resolution?: '480p' | '720p' | '1080p' | '4k';
      includeCaptions?: boolean;
      captionStyle?: any;
    }) => {
      const response = await fetch(`/api/projects/${projectId}/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to compile video');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Video compiled successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
