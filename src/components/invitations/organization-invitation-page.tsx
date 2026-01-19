'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import { useAcceptInvitation } from '@/hooks/use-organizations';

interface OrganizationInvitationPageProps {
  token: string;
  userId: string;
}

export function OrganizationInvitationPage({ token, userId }: OrganizationInvitationPageProps) {
  const [invitationData, setInvitationData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const acceptInvitation = useAcceptInvitation();

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const response = await fetch(`/api/organizations/invitations/${token}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to fetch invitation');
        }
        const data = await response.json();
        setInvitationData(data.invitation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation');
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    try {
      await acceptInvitation.mutateAsync(token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  };

  const handleDecline = async () => {
    try {
      await fetch(`/api/organizations/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' }),
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline invitation');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" text="Loading invitation..." />
      </div>
    );
  }

  if (error || !invitationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isExpired = invitationData.expiresAt && new Date(invitationData.expiresAt) < new Date();

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full rounded-lg border border-border bg-surface p-6 shadow-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
            <svg className="h-6 w-6 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Organization Invitation</h2>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-muted">
            You've been invited to join <strong>{invitationData.organization?.name}</strong>
          </p>
          <div className="rounded-md bg-surface-muted p-3 text-sm">
            <p className="text-muted">Role: <span className="font-medium capitalize text-foreground">{invitationData.role}</span></p>
            {invitationData.expiresAt && (
              <p className={`mt-1 ${isExpired ? 'text-red-600' : 'text-muted'}`}>
                Expires: {new Date(invitationData.expiresAt).toLocaleDateString()}
                {isExpired && ' (Expired)'}
              </p>
            )}
          </div>
        </div>

        {isExpired ? (
          <div className="text-center">
            <p className="text-red-600 mb-4">This invitation has expired.</p>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Go to Dashboard
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button
              onClick={handleDecline}
              variant="outline"
              className="flex-1"
              disabled={acceptInvitation.isPending}
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1"
              isLoading={acceptInvitation.isPending}
            >
              Accept Invitation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}