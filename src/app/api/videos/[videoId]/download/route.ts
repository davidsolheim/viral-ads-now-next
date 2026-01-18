import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getFinalVideo, checkUserOrganizationAccess } from '@/lib/db-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const session = await auth();
    const { videoId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the video with project information
    const video = await getFinalVideo(videoId);

    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Verify user has access to the project's organization
    const hasAccess = await checkUserOrganizationAccess(
      session.user.id,
      video.project.organizationId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch the video from Wasabi storage
    const videoResponse = await fetch(video.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video: ${videoResponse.statusText}`);
    }

    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();

    // Generate filename
    const projectName = video.project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateStr = new Date(video.createdAt).toISOString().split('T')[0];
    const filename = `${projectName}-${dateStr}.mp4`;

    // Return the video as a download
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': videoBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to download video' },
      { status: 500 }
    );
  }
}
