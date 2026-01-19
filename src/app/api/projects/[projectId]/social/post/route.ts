import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { getSocialPosts, createSocialPost, getProjectFinalVideo, updateSocialPost } from '@/lib/db-queries';
import { getProject } from '@/lib/db-queries';

const createPostSchema = z.object({
  socialAccountId: z.string().min(1),
  platform: z.enum(['tiktok', 'instagram_reels', 'youtube_shorts', 'facebook', 'twitter']),
  title: z.string().optional(),
  description: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

// GET /api/projects/[projectId]/social/post - List social posts for project's final video
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

    const finalVideo = await getProjectFinalVideo(projectId);

    if (!finalVideo) {
      return NextResponse.json({ posts: [] });
    }

    const posts = await getSocialPosts(finalVideo.id);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching social posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[projectId]/social/post - Create and schedule a social post
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

    const finalVideo = await getProjectFinalVideo(projectId);

    if (!finalVideo) {
      return NextResponse.json(
        { error: 'No final video found for this project' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = createPostSchema.parse(body);

    const scheduledAt = validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined;
    const isScheduledForFuture = scheduledAt && scheduledAt > new Date();

    const post = await createSocialPost({
      finalVideoId: finalVideo.id,
      socialAccountId: validatedData.socialAccountId,
      platform: validatedData.platform,
      title: validatedData.title,
      description: validatedData.description,
      hashtags: validatedData.hashtags,
      scheduledAt,
    });

    // Set initial status based on scheduling
    if (isScheduledForFuture) {
      // Post is scheduled for future - mark as scheduled
      await updateSocialPost(post.id, { status: 'scheduled' });

      // TODO: Add to postScheduleQueue for background processing
      // This would be handled by a background job processor
    } else {
      // Post should be published immediately or as soon as possible
      await updateSocialPost(post.id, { status: 'draft' });

      // TODO: Trigger immediate posting via background job
      // For now, we'll mark it as draft and let a background process handle it
    }

    return NextResponse.json({
      post: {
        ...post,
        status: isScheduledForFuture ? 'scheduled' : 'draft'
      }
    }, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: error.issues },
          { status: 400 }
        );
      }

    console.error('Error creating social post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}