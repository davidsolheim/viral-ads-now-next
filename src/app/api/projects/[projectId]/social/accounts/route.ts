import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { getSocialAccounts, createSocialAccount } from '@/lib/db-queries';
import { getProject } from '@/lib/db-queries';

const createAccountSchema = z.object({
  platform: z.enum(['tiktok', 'instagram_reels', 'youtube_shorts', 'facebook', 'twitter']),
  accountName: z.string().min(1),
  accountId: z.string().min(1),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional(),
  scopes: z.array(z.string()).optional(),
});

// GET /api/projects/[projectId]/social/accounts - List social accounts for project's organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const project = await getProject(projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access to this project's organization
    // TODO: Implement proper organization access control

    const accounts = await getSocialAccounts(project.organizationId);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/social/accounts - Connect a new social account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    const project = await getProject(projectId);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access to this project's organization
    // TODO: Implement proper organization access control

    const body = await request.json();
    const validatedData = createAccountSchema.parse(body);

    const account = await createSocialAccount({
      organizationId: project.organizationId,
      platform: validatedData.platform,
      accountName: validatedData.accountName,
      accountId: validatedData.accountId,
      accessToken: validatedData.accessToken,
      refreshToken: validatedData.refreshToken,
      tokenExpiresAt: validatedData.tokenExpiresAt ? new Date(validatedData.tokenExpiresAt) : undefined,
      scopes: validatedData.scopes,
    });

    return NextResponse.json({ account }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.issues },
          { status: 400 }
        );
      }

    console.error('Error creating social account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}