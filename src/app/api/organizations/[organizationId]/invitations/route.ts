import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getInvitationsByOrganization,
  createInvitation,
  checkUserOrganizationAccess,
} from '@/lib/db-queries';
import { z } from 'zod';

const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'member']),
  expiresInDays: z.number().min(1).max(30).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await params;

    // Check user has access
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const invitations = await getInvitationsByOrganization(organizationId, 'pending');

    return NextResponse.json({ invitations }, { status: 200 });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await params;

    // Check user has access and is admin or owner
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createInvitationSchema.parse(body);

    // Can't invite as owner unless current user is owner
    if (validatedData.role === 'owner' && member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can invite other owners' },
        { status: 403 }
      );
    }

    const expiresAt = validatedData.expiresInDays
      ? new Date(Date.now() + validatedData.expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const invitation = await createInvitation({
      email: validatedData.email,
      organizationId,
      role: validatedData.role,
      invitedById: session.user.id,
      expiresAt,
    });

    // TODO: Send invitation email here

    // Send invitation email
    try {
      const { sendOrganizationInvitationEmail } = await import('@/lib/services/email');
      const inviteUrl = `${process.env.NEXTAUTH_URL}/invitations/${invitation.token}`;

      await sendOrganizationInvitationEmail({
        email: validatedData.email,
        organizationName: member.organization.name,
        invitedByName: member.user.name || member.user.email,
        inviteUrl,
        expiresAt: invitation.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
