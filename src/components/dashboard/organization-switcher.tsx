'use client';

import { useState } from 'react';
import { useOrganizations, useSwitchOrganization } from '@/hooks/use-organizations';
import { Button } from '@/components/ui/button';
import { CreateOrganizationModal } from './create-organization-modal';
import { Loading } from '@/components/ui/loading';

interface OrganizationSwitcherProps {
  activeOrganizationId?: string | null;
  onOrganizationChange?: () => void;
  compact?: boolean;
}

export function OrganizationSwitcher({ 
  activeOrganizationId, 
  onOrganizationChange,
  compact = false 
}: OrganizationSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: organizations, isLoading } = useOrganizations();
  const switchOrganization = useSwitchOrganization();

  const activeOrg = organizations?.find((org) => org.organization.id === activeOrganizationId);

  const handleSwitch = async (organizationId: string) => {
    if (organizationId === activeOrganizationId) {
      setIsOpen(false);
      return;
    }
    await switchOrganization.mutateAsync(organizationId);
    // Close dropdown immediately, don't wait for mutation to complete
    setIsOpen(false);
    onOrganizationChange?.();
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      owner: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800',
    };
    return colors[role as keyof typeof colors] || colors.member;
  };

  if (isLoading) {
    return (
      <div className="flex items-center">
        <Loading size="sm" />
      </div>
    );
  }

  if (compact) {
    // Compact version for use in dropdown menus
    return (
      <div className="space-y-1">
        {organizations && organizations.length > 0 ? (
          organizations.map((org) => (
            <button
              key={org.organization.id}
              onClick={() => handleSwitch(org.organization.id)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                org.organization.id === activeOrganizationId
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">{org.organization.name}</span>
                {org.organization.id === activeOrganizationId && (
                  <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadge(org.role)}`}>
                  {org.role}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-center text-sm text-gray-500">
            No organizations
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <span className="max-w-[150px] truncate">
            {activeOrg?.organization.name || 'Select Organization'}
          </span>
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 z-20 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
              <div className="p-2">
                <div className="mb-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Organizations
                </div>
                
                {organizations && organizations.length > 0 ? (
                  <div className="space-y-1">
                    {organizations.map((org) => (
                      <button
                        key={org.organization.id}
                        onClick={() => handleSwitch(org.organization.id)}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          org.organization.id === activeOrganizationId
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{org.organization.name}</span>
                          {org.organization.id === activeOrganizationId && (
                            <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadge(org.role)}`}>
                            {org.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                    No organizations
                  </div>
                )}

                <div className="mt-2 border-t border-gray-200 pt-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setIsCreateModalOpen(true);
                    }}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Create Organization
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </>
  );
}
