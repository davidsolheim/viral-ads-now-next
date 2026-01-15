import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  createProject,
  ensureDefaultOrganization,
  getProjectsByOrganization,
} from '@/lib/db-queries';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  organizationId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    // TODO: Check if user has access to the organization
    await ensureDefaultOrganization(session.user.id, validatedData.organizationId);

    const project = await createProject({
      name: validatedData.name,
      organizationId: validatedData.organizationId,
      creatorId: session.user.id,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId is required' },
        { status: 400 }
      );
    }

    // TODO: Check if user has access to the organization
    await ensureDefaultOrganization(session.user.id, organizationId);

    const projects = await getProjectsByOrganization(organizationId);

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
