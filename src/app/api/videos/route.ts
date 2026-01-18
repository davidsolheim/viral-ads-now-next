import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFinalVideosByOrganization } from '@/lib/db-queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // TODO: Verify user has access to this organization
    // For now, we'll rely on the organizationId from the session

    const videos = await getFinalVideosByOrganization(organizationId);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}
