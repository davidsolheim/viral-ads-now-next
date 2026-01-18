import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

interface OrganizationMember {
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member';
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
}

interface OrganizationWithMembers {
  organization: Organization;
  members: Array<{
    userId: string;
    role: 'owner' | 'admin' | 'member';
    user: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  }>;
}

interface UserOrganization {
  organization: Organization;
  role: 'owner' | 'admin' | 'member';
}

interface Invitation {
  id: string;
  email: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
  invitedById: string;
  createdAt: Date;
  expiresAt: Date | null;
}

interface CreateOrganizationData {
  name: string;
  slug?: string;
}

interface UpdateOrganizationData {
  name?: string;
  slug?: string;
}

interface AddMemberData {
  userId: string;
  role: 'owner' | 'admin' | 'member';
}

interface UpdateMemberRoleData {
  role: 'owner' | 'admin' | 'member';
}

interface SendInvitationData {
  email: string;
  role: 'owner' | 'admin' | 'member';
  expiresInDays?: number;
}

export function useOrganizations() {
  return useQuery<UserOrganization[]>({
    queryKey: ['organizations'],
    queryFn: async () => {
      const response = await fetch('/api/organizations');
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      const data = await response.json();
      return data.organizations as UserOrganization[];
    },
  });
}

export function useOrganization(organizationId: string | undefined) {
  return useQuery<OrganizationWithMembers>({
    queryKey: ['organization', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');
      
      const response = await fetch(`/api/organizations/${organizationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch organization');
      }
      return response.json() as Promise<OrganizationWithMembers>;
    },
    enabled: !!organizationId,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrganizationData) => {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create organization');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization created successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateOrganizationData) => {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update organization');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteOrganization(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/organizations/${organizationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete organization');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useSwitchOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const response = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to switch organization');
      }

      return response.json();
    },
    onSuccess: (data, organizationId) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      // Invalidate all queries that depend on active organization
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Switched organization!');
      // The session will be updated on the next page load, so we don't need to reload
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useOrganizationMembers(organizationId: string | undefined) {
  return useQuery<OrganizationMember[]>({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');
      
      const response = await fetch(`/api/organizations/${organizationId}/members`);
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const data = await response.json();
      return data.members as OrganizationMember[];
    },
    enabled: !!organizationId,
  });
}

export function useAddMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddMemberData) => {
      const response = await fetch(`/api/organizations/${organizationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      toast.success('Member added successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRemoveMember(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove member');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      toast.success('Member removed successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMemberRole(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'owner' | 'admin' | 'member' }) => {
      const response = await fetch(`/api/organizations/${organizationId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update member role');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['organization', organizationId] });
      toast.success('Member role updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useInvitations(organizationId: string | undefined) {
  return useQuery<Invitation[]>({
    queryKey: ['organization-invitations', organizationId],
    queryFn: async () => {
      if (!organizationId) throw new Error('Organization ID is required');
      
      const response = await fetch(`/api/organizations/${organizationId}/invitations`);
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      const data = await response.json();
      return data.invitations as Invitation[];
    },
    enabled: !!organizationId,
  });
}

export function useSendInvitation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendInvitationData) => {
      const response = await fetch(`/api/organizations/${organizationId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', organizationId] });
      toast.success('Invitation sent successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCancelInvitation(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/organizations/${organizationId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-invitations', organizationId] });
      toast.success('Invitation canceled successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch(`/api/organizations/invitations/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept invitation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Invitation accepted!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
