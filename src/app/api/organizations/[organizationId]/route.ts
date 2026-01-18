import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getOrganizationWithMembers,
  updateOrganization,
  deleteOrganization,
  checkUserOrganizationAccess,
  getOrganizationOwnerCount,
} from '@/lib/db-queries';
import { z } from 'zod';

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
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

    const orgWithMembers = await getOrganizationWithMembers(organizationId);

    if (!orgWithMembers) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(orgWithMembers, { status: 200 });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const validatedData = updateOrganizationSchema.parse(body);

    const organization = await updateOrganization(organizationId, validatedData);

    return NextResponse.json({ organization }, { status: 200 });
  } catch (error) {
    console.error('Error updating organization:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'An organization with this slug already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await params;

    // Check user is owner
    const member = await checkUserOrganizationAccess(session.user.id, organizationId);
    if (!member || member.role !== 'owner') {
      return NextResponse.json({ error: 'Forbidden - Only owners can delete organizations' }, { status: 403 });
    }

    // Check there's only one owner (prevent deleting if multiple owners)
    const ownerCount = await getOrganizationOwnerCount(organizationId);
    if (ownerCount > 1) {
      return NextResponse.json(
        { error: 'Cannot delete organization with multiple owners. Transfer ownership first.' },
        { status: 400 }
      );
    }

    const organization = await deleteOrganization(organizationId);

    return NextResponse.json({ organization }, { status: 200 });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
