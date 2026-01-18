import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { switchActiveOrganization } from '@/lib/db-queries';
import { z } from 'zod';

const switchOrganizationSchema = z.object({
  organizationId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = switchOrganizationSchema.parse(body);

    const user = await switchActiveOrganization(session.user.id, validatedData.organizationId);

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Error switching organization:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to switch organization' },
      { status: 500 }
    );
  }
}
