'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface ProfileSettingsClientProps {
  userId: string;
  initialName?: string | null;
  initialEmail: string;
  initialImage?: string | null;
}

export function ProfileSettingsClient({
  userId,
  initialName,
  initialEmail,
  initialImage,
}: ProfileSettingsClientProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName || '');
  const [email] = useState(initialEmail);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="mt-2 text-muted">
          Manage your account information and preferences
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Picture Section */}
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              {initialImage ? (
                <img
                  src={initialImage}
                  alt={name || 'Profile'}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-medium text-white">
                  {(name || email).substring(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-muted">
                  Profile pictures are managed through your authentication provider (Google, etc.)
                </p>
              </div>
            </div>
          </div>

          {/* Name Field */}
          <div>
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              type="text"
            />
          </div>

          {/* Email Field (Read-only) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-border bg-surface-muted px-4 py-2 text-sm text-muted"
            />
            <p className="mt-1 text-xs text-subtle">
              Email cannot be changed. It's managed through your authentication provider.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
