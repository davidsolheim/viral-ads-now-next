import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  cancelInvitation,
  checkUserOrganizationAccess,
} from '@/lib/db-queries';
import { z } from 'zod';

const updateInvitationSchema = z.object({
  status: z.enum(['accepted', 'declined']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; invitationId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invitationId } = await params;
    const body = await request.json();
    const validatedData = updateInvitationSchema.parse(body);

    // For now, we'll handle accept/decline through token endpoint
    // This endpoint is primarily for admin/owner to cancel
    return NextResponse.json(
      { error: 'Use invitation token endpoint to accept/decline' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating invitation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update invitation' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string; invitationId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId, invitationId } = await params;

    // Check user has access and is admin or owner
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await cancelInvitation(invitationId);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error canceling invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
