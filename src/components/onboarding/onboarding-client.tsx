'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import toast from 'react-hot-toast';

interface OnboardingClientProps {
  userId: string;
  initialName?: string | null;
  email: string;
  image?: string | null;
}

export function OnboardingClient({
  userId,
  initialName,
  email,
  image,
}: OnboardingClientProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName || '');
  const [organizationName, setOrganizationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Generate slug preview from organization name
  const slugPreview = useMemo(() => {
    if (!organizationName.trim()) return '';
    
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    return slug || '';
  }, [organizationName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!organizationName.trim()) {
      toast.error('Please enter an organization name');
      return;
    }

    if (organizationName.trim().length > 255) {
      toast.error('Organization name must be 255 characters or less');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          organizationName: organizationName.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete onboarding');
      }

      toast.success('Welcome to Viral Ads Now!');
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <Image
            src="/icon.svg"
            alt="Viral Ads Now"
            width={64}
            height={64}
            className="mx-auto h-16 w-16 rounded-xl mb-4"
          />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Welcome to Viral Ads Now!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Let's get you set up with your account and organization
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Your Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Input
              label="Organization Name"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="My Company"
              required
              disabled={isSubmitting}
              maxLength={255}
            />
            {slugPreview && (
              <p className="mt-1 text-xs text-gray-500">
                URL: <span className="font-mono">{slugPreview}</span>
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This is your workspace name. You can create more organizations later.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Continue
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}