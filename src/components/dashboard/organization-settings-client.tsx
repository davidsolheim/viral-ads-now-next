'use client';

import { useState } from 'react';
import { useOrganizations, useSwitchOrganization } from '@/hooks/use-organizations';
import { OrganizationDetail } from './organization-detail';
import { CreateOrganizationModal } from './create-organization-modal';
import { Button } from '@/components/ui/button';
import { Loading } from '@/components/ui/loading';
import Link from 'next/link';

interface OrganizationSettingsClientProps {
  userId: string;
  activeOrganizationId?: string | null;
}

export function OrganizationSettingsClient({ userId, activeOrganizationId }: OrganizationSettingsClientProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(activeOrganizationId || null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: organizations, isLoading } = useOrganizations();
  const switchOrganization = useSwitchOrganization();

  const selectedOrg = organizations?.find((org) => org.organization.id === selectedOrgId);

  const handleSelectOrg = (organizationId: string) => {
    setSelectedOrgId(organizationId);
  };

  const handleSwitchOrg = async (organizationId: string) => {
    await switchOrganization.mutateAsync(organizationId);
    setSelectedOrgId(organizationId);
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-brand-100 text-brand-700',
      member: 'bg-surface-alt text-muted',
    };
    return colors[role as keyof typeof colors] || colors.member;
  };

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center">
          <Loading size="lg" text="Loading organizations..." />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Organization Settings</h2>
        <p className="mt-1 text-sm text-muted">
          Manage your organizations, members, and invitations
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Organizations List */}
        <div className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">My Organizations</h3>
              <Button
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New
              </Button>
            </div>

            {organizations && organizations.length > 0 ? (
              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.organization.id}
                    onClick={() => handleSelectOrg(org.organization.id)}
                    className={`w-full rounded-md p-3 text-left transition-colors ${
                      selectedOrgId === org.organization.id
                        ? 'bg-brand-50 border border-brand/30'
                        : 'border border-border hover:bg-surface-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {org.organization.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadge(org.role)}`}>
                            {org.role}
                          </span>
                        </div>
                      </div>
                      {org.organization.id === activeOrganizationId && (
                        <span className="ml-2 text-xs font-medium text-brand">Active</span>
                      )}
                    </div>
                    {org.organization.id !== activeOrganizationId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchOrg(org.organization.id);
                        }}
                        className="mt-2 text-xs text-brand hover:text-brand-700"
                      >
                        Switch to this organization
                      </button>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-subtle">
                <p>No organizations yet</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4"
                >
                  Create Organization
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Organization Details */}
        <div className="lg:col-span-2">
          {selectedOrg ? (
            <OrganizationDetail
              organizationId={selectedOrg.organization.id}
              userRole={selectedOrg.role}
              userId={userId}
            />
          ) : (
            <div className="rounded-lg border border-border bg-surface p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-subtle"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-foreground">Select an organization</h3>
              <p className="mt-2 text-sm text-muted">
                Choose an organization from the list to view and manage its details
              </p>
            </div>
          )}
        </div>
      </div>

      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </main>
  );
}
