import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getOrganizationMembers,
  addOrganizationMember,
  checkUserOrganizationAccess,
} from '@/lib/db-queries';
import { z } from 'zod';

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
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

    const members = await getOrganizationMembers(organizationId);

    // Get user details for each member
    const { db } = await import('@/db');
    const { users } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');

    const membersWithUsers = await Promise.all(
      members.map(async (m: any) => {
        const [user] = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
          })
          .from(users)
          .where(eq(users.id, m.userId))
          .limit(1);

        return {
          ...m,
          user: user || null,
        };
      })
    );

    return NextResponse.json({ members: membersWithUsers }, { status: 200 });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
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
    const validatedData = addMemberSchema.parse(body);

    // Can't add owner role unless current user is owner
    if (validatedData.role === 'owner' && member.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can add other owners' },
        { status: 403 }
      );
    }

    const newMember = await addOrganizationMember({
      userId: validatedData.userId,
      organizationId,
      role: validatedData.role,
    });

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    console.error('Error adding member:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add member' },
      { status: 500 }
    );
  }
}
