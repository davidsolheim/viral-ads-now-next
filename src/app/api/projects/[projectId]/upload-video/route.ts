import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, createFinalVideo, updateProjectStep } from '@/lib/db-queries';
import { uploadFile } from '@/lib/services/wasabi';
import { trackUsageAndCheckLimits } from '@/lib/middleware/usage-tracking';
import { z } from 'zod';

const uploadVideoSchema = z.object({
  musicVolume: z.number().min(0).max(1).optional(),
  resolution: z.string().optional(),
  includeCaptions: z.boolean().optional(),
  captionStyle: z.object({
    font: z.string().optional(),
    fontSize: z.number().optional(),
    color: z.string().optional(),
    backgroundColor: z.string().optional(),
    position: z.string().optional(),
  }).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await auth();
    const { projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get project
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const optionsJson = formData.get('options') as string;

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    // Parse options
    let options: any = {};
    if (optionsJson) {
      try {
        options = JSON.parse(optionsJson);
        uploadVideoSchema.parse(options);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid options format' },
          { status: 400 }
        );
      }
    }

    // Convert File to Buffer
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Calculate duration (approximate based on file size, or can be passed as option)
    const totalDuration = options.durationSeconds || Math.round(buffer.length / 1000000); // Rough estimate

    // Check usage limits before uploading
    const usageCheck = await trackUsageAndCheckLimits({
      organizationId: project.organizationId,
      userId: session.user.id,
      projectId,
      usageType: 'video_render',
      units: 1,
      cost: 0.1, // Approximate cost per video render (adjust based on actual costs)
      provider: 'internal',
    });

    if (!usageCheck.allowed) {
      return NextResponse.json(
        { error: usageCheck.reason || 'Usage limit exceeded' },
        { status: 403 }
      );
    }

    // Upload to Wasabi
    const uploadResult = await uploadFile({
      file: buffer,
      fileName: `final-video-${Date.now()}.mp4`,
      contentType: 'video/mp4',
      organizationId: project.organizationId,
      projectId,
      assetType: 'master',
      metadata: {
        type: 'final_video',
        resolution: options.resolution || '1080p',
      },
    });

    // Save final video to database
    const finalVideo = await createFinalVideo({
      projectId,
      url: uploadResult.url,
      durationSeconds: totalDuration,
      resolution: options.resolution || '1080p',
      metadata: {
        musicVolume: options.musicVolume,
        includeCaptions: options.includeCaptions,
        captionStyle: options.captionStyle,
      },
    });

    // Update project step
    await updateProjectStep(projectId, 'complete');

    return NextResponse.json({ video: finalVideo }, { status: 201 });
  } catch (error) {
    console.error('Error uploading video:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload video' },
      { status: 500 }
    );
  }
}