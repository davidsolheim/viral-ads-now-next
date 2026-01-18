import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getInvitationByToken,
  acceptInvitation,
  declineInvitation,
} from '@/lib/db-queries';
import { z } from 'zod';

const updateInvitationSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if expired
    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    return NextResponse.json({ invitation }, { status: 200 });
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { token } = await params;
    const body = await request.json();
    const validatedData = updateInvitationSchema.parse(body);

    if (validatedData.action === 'accept') {
      const member = await acceptInvitation(token, session.user.id);

      // Switch to the organization
      const { switchActiveOrganization } = await import('@/lib/db-queries');
      await switchActiveOrganization(session.user.id, member.organizationId);

      return NextResponse.json({ member, redirectTo: '/dashboard' }, { status: 200 });
    } else if (validatedData.action === 'decline') {
      const invitation = await declineInvitation(token);
      return NextResponse.json({ invitation }, { status: 200 });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error processing invitation:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process invitation' },
      { status: 500 }
    );
  }
}
