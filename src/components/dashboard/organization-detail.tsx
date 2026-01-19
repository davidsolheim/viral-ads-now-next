'use client';

import { useState } from 'react';
import {
  useOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useOrganizationMembers,
  useAddMember,
  useRemoveMember,
  useUpdateMemberRole,
  useInvitations,
  useSendInvitation,
  useCancelInvitation,
} from '@/hooks/use-organizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Loading } from '@/components/ui/loading';

interface OrganizationDetailProps {
  organizationId: string;
  userRole: 'owner' | 'admin' | 'member';
  userId: string;
}

export function OrganizationDetail({ organizationId, userRole, userId }: OrganizationDetailProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  const { data: orgData, isLoading } = useOrganization(organizationId);
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(organizationId);
  const { data: invitations, isLoading: invitationsLoading } = useInvitations(organizationId);

  const updateOrganization = useUpdateOrganization(organizationId);
  const deleteOrganization = useDeleteOrganization(organizationId);
  const addMember = useAddMember(organizationId);
  const removeMember = useRemoveMember(organizationId);
  const updateMemberRole = useUpdateMemberRole(organizationId);
  const sendInvitation = useSendInvitation(organizationId);
  const cancelInvitation = useCancelInvitation(organizationId);

  const isOwner = userRole === 'owner';
  const isAdmin = userRole === 'admin' || isOwner;

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;

    await updateOrganization.mutateAsync({
      name: editName.trim(),
      slug: editSlug.trim() || undefined,
    });
    setIsEditModalOpen(false);
    setEditName('');
    setEditSlug('');
  };

  const handleDelete = async () => {
    await deleteOrganization.mutateAsync();
    setIsDeleteModalOpen(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    await sendInvitation.mutateAsync({
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteRole('member');
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (confirm('Are you sure you want to remove this member?')) {
      await removeMember.mutateAsync(memberUserId);
    }
  };

  const handleUpdateRole = async (memberUserId: string, role: 'owner' | 'admin' | 'member') => {
    await updateMemberRole.mutateAsync({ userId: memberUserId, role });
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (confirm('Are you sure you want to cancel this invitation?')) {
      await cancelInvitation.mutateAsync(invitationId);
    }
  };

  const openEditModal = () => {
    if (orgData) {
      setEditName(orgData.organization.name);
      setEditSlug(orgData.organization.slug);
    }
    setIsEditModalOpen(true);
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
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-surface">
        <Loading size="lg" text="Loading organization..." />
      </div>
    );
  }

  if (!orgData) {
    return (
      <div className="rounded-lg border border-border bg-surface p-12 text-center">
        <p className="text-muted">Organization not found</p>
      </div>
    );
  }

  const organization = orgData.organization;

  return (
    <div className="space-y-6">
      {/* Organization Info */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{organization.name}</h3>
            <p className="mt-1 text-sm text-muted">
              Slug: <span className="font-mono">{organization.slug}</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              Created: {new Date(organization.createdAt).toLocaleDateString()}
            </p>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openEditModal}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Members</h3>
          {isAdmin && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsInviteModalOpen(true)}>
                Send Invitation
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAddMemberModalOpen(true)}>
                Add Member
              </Button>
            </div>
          )}
        </div>

        {membersLoading ? (
          <div className="py-8 text-center">
            <Loading size="sm" text="Loading members..." />
          </div>
        ) : members && members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Role
                  </th>
                  {isOwner && (
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {members.map((member) => {
                  const isCurrentUser = member.userId === userId;
                  const isMemberOwner = member.role === 'owner';
                  const canEdit = isOwner && !isMemberOwner && !isCurrentUser;

                  return (
                    <tr key={member.userId}>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex items-center">
                          {member.user?.image ? (
                            <img
                              className="h-8 w-8 rounded-full"
                              src={member.user.image}
                              alt={member.user.name || member.user.email}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">
                                {member.user?.name?.[0] || member.user?.email[0] || '?'}
                              </span>
                            </div>
                          )}
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {member.user?.name || member.user?.email}
                              {isCurrentUser && <span className="ml-2 text-gray-500">(You)</span>}
                            </div>
                            {member.user?.email && member.user.name && (
                              <div className="text-sm text-gray-500">{member.user.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        {canEdit ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleUpdateRole(member.userId, e.target.value as 'owner' | 'admin' | 'member')
                            }
                            className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleBadge(member.role)} border-none`}
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                          </select>
                        ) : (
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${getRoleBadge(member.role)}`}>
                            {member.role}
                          </span>
                        )}
                      </td>
                      {isOwner && (
                        <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium">
                          {canEdit && (
                            <button
                              onClick={() => handleRemoveMember(member.userId)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-gray-500">No members found</div>
        )}
      </div>

      {/* Invitations Section */}
      {isAdmin && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Pending Invitations</h3>

          {invitationsLoading ? (
            <div className="py-8 text-center">
              <Loading size="sm" text="Loading invitations..." />
            </div>
          ) : invitations && invitations.length > 0 ? (
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 p-3"
                >
                  <div>
                    <div className="font-medium text-gray-900">{invitation.email}</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadge(invitation.role)}`}>
                        {invitation.role}
                      </span>
                      <span className="text-xs text-gray-500">
                        Sent {new Date(invitation.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-500">No pending invitations</div>
          )}
        </div>
      )}

      {/* Danger Zone */}
      {isOwner && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-red-900">Danger Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-900">Delete Organization</p>
              <p className="mt-1 text-sm text-red-700">
                This will permanently delete the organization and all its data.
              </p>
            </div>
            <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
              Delete Organization
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Organization">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Organization Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Slug"
            value={editSlug}
            onChange={(e) => setEditSlug(e.target.value)}
            pattern="^[a-z0-9-]+$"
            helperText="Lowercase letters, numbers, and hyphens only"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateOrganization.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Organization">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this organization? This action cannot be undone and will permanently delete
            all data associated with this organization.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={deleteOrganization.isPending}>
              Delete Organization
            </Button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Send Invitation">
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="user@example.com"
            required
            autoFocus
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
              className="block w-full rounded-xl border border-border px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              {isOwner && <option value="owner">Owner</option>}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={sendInvitation.isPending}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal - Simplified version (would need user search in real app) */}
      <Modal isOpen={isAddMemberModalOpen} onClose={() => setIsAddMemberModalOpen(false)} title="Add Member">
        <p className="mb-4 text-sm text-muted">
          To add a member directly, you need their user ID. For most cases, use invitations instead.
        </p>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setIsAddMemberModalOpen(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}
