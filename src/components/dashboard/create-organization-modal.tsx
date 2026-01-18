'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateOrganization } from '@/hooks/use-organizations';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateOrganizationModal({ isOpen, onClose }: CreateOrganizationModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(true);
  const createOrganization = useCreateOrganization();

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (autoGenerateSlug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createOrganization.mutateAsync({
        name: name.trim(),
        slug: slug.trim() || undefined,
      });
      setName('');
      setSlug('');
      setAutoGenerateSlug(true);
      onClose();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Organization" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Organization Name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="My Organization"
          required
          autoFocus
        />
        <div>
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setAutoGenerateSlug(false);
            }}
            placeholder="my-organization"
            required
            pattern="^[a-z0-9-]+$"
            helperText="Lowercase letters, numbers, and hyphens only. Used in URLs."
          />
          {autoGenerateSlug && (
            <p className="mt-1 text-xs text-gray-500">Slug will be auto-generated from name</p>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createOrganization.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={createOrganization.isPending}>
            Create Organization
          </Button>
        </div>
      </form>
    </Modal>
  );
}
