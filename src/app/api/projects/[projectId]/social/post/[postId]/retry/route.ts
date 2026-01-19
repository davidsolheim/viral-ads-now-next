import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateSocialPost } from '@/lib/db-queries';

// POST /api/projects/[projectId]/social/post/[postId]/retry - Retry a failed social post
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; postId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, postId } = await params;

    // TODO: Verify user has access to this project

    // Reset post status and increment retry count
    const updatedPost = await updateSocialPost(postId, {
      status: 'draft',
      retryCount: 0, // Reset retry count
      errorDetails: null,
    });

    // TODO: Trigger background job to retry the post

    return NextResponse.json({
      post: updatedPost,
      message: 'Post queued for retry'
    });
  } catch (error) {
    console.error('Error retrying social post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}