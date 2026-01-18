'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjects, useCreateProject } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loading } from '@/components/ui/loading';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface DashboardClientProps {
  userId: string;
  organizationId?: string;
}

// Helper function to generate project name from URL
function generateProjectNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Extract the last meaningful part of the path
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1] || urlObj.hostname;
    
    // Clean up the name: replace dashes/underscores with spaces, remove file extensions
    let name = lastPart
      .replace(/[-_]/g, ' ')
      .replace(/\.(html|htm|php|aspx|jsp)/i, '')
      .trim();
    
    // Capitalize first letter of each word
    name = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // If name is too short or generic, use hostname
    if (name.length < 3 || name.toLowerCase() === 'product' || name.toLowerCase() === 'item') {
      name = urlObj.hostname.replace('www.', '').split('.')[0];
      name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    return name || 'New Project';
  } catch {
    // If URL parsing fails, try to extract from string
    const parts = url.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1] || 'Product';
    return lastPart
      .replace(/[-_]/g, ' ')
      .replace(/\.(html|htm|php|aspx|jsp)/i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ') || 'New Project';
  }
}

export function DashboardClient({ userId, organizationId }: DashboardClientProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const router = useRouter();

  // Use provided organizationId or fall back to default
  const activeOrganizationId = organizationId || 'default-org';

  const { data: projects, isLoading } = useProjects(activeOrganizationId);
  const createProject = useCreateProject();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productUrl.trim() || !activeOrganizationId) return;

    // Validate URL format
    try {
      new URL(productUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    // Generate project name from URL
    const projectName = generateProjectNameFromUrl(productUrl);

    try {
      const result = await createProject.mutateAsync({
        name: projectName,
        organizationId: activeOrganizationId,
        productUrl: productUrl,
      });

      setProductUrl('');
      setIsCreateModalOpen(false);
      
      // Navigate to the project page
      if (result?.project?.id) {
        router.push(`/projects/${result.project.id}`);
      }
    } catch (error) {
      // Error is already handled by the mutation's onError callback
      console.error('Failed to create project:', error);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Projects</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create and manage your video ad projects
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <svg
            className="mr-2 h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading size="lg" text="Loading projects..." />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-blue-500 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                  {project.name}
                </h3>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                  {project.currentStep}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-4 flex items-center text-sm text-blue-600 group-hover:text-blue-700">
                Continue editing
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      ) : (
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
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects yet</h3>
          <p className="mt-2 text-sm text-gray-600 text-center max-w-md">
            Get started by creating your first video ad project. You can manage your organization and team members in the settings.
          </p>
          <div className="flex gap-3 mt-6">
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Project
            </Button>
            <Link href="/settings/organizations">
              <Button variant="outline">
                Manage Organization
              </Button>
            </Link>
          </div>
        </div>
      )}

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <Input
              label="Product URL"
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://example.com/products/your-item"
              required
              autoFocus
            />
            <p className="mt-1 text-sm text-gray-500">
              Paste the URL of the product you want to create an ad for. We'll automatically name your project.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setProductUrl('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createProject.isPending}>
              Create Project
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
