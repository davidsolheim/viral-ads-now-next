import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  updateMemberRole,
  removeOrganizationMember,
  checkUserOrganizationAccess,
  getOrganizationOwnerCount,
} from '@/lib/db-queries';
import { z } from 'zod';

const updateRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, userId } = await params;

    // Check user is owner
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - Only owners can update member roles' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateRoleSchema.parse(body);

    // Can't change owner role
    const targetMember = await checkUserOrganizationAccess(userId, organizationId);
    if (targetMember?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot change owner role' },
        { status: 400 }
      );
    }

    // If setting to owner, check if there's already an owner
    if (validatedData.role === 'owner') {
      const ownerCount = await getOrganizationOwnerCount(organizationId);
      if (ownerCount > 0) {
        // Allow multiple owners, but warn in UI
      }
    }

    const updated = await updateMemberRole(userId, organizationId, validatedData.role);

    return NextResponse.json({ member: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating member role:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; userId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, userId } = await params;

    // Check user has access and is admin or owner
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Can't remove owner
    const targetMember = await checkUserOrganizationAccess(userId, organizationId);
    if (targetMember?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove owner. Transfer ownership first.' },
        { status: 400 }
      );
    }

    // Check if removing the last owner (shouldn't happen based on above check, but safety check)
    const ownerCount = await getOrganizationOwnerCount(organizationId);
    if (ownerCount <= 1 && targetMember?.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the last owner' },
        { status: 400 }
      );
    }

    await removeOrganizationMember(userId, organizationId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
