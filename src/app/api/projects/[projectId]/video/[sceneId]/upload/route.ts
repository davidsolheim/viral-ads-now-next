import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, createMediaAsset, updateProjectStep } from '@/lib/db-queries';
import { uploadFile } from '@/lib/services/wasabi';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; sceneId: string }> }
) {
  try {
    const session = await auth();
    const { projectId, sceneId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload a video.' }, { status: 400 });
    }

    const videoBuffer = await file.arrayBuffer();
    const uploadResult = await uploadFile({
      file: Buffer.from(videoBuffer),
      organizationId: project.organizationId,
      projectId,
      assetType: 'video',
      fileName: file.name,
      contentType: file.type,
      metadata: {
        source: 'custom_upload',
        originalFileName: file.name,
        originalType: file.type,
      },
    });

    const asset = await createMediaAsset({
      projectId,
      sceneId,
      type: 'video_clip',
      url: uploadResult.url,
      metadata: {
        source: 'custom_upload',
        fileName: file.name,
      },
    });

    await updateProjectStep(projectId, 'voiceover');

    return NextResponse.json({ video: asset }, { status: 201 });
  } catch (error) {
    console.error('Error uploading video clip:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload video' },
      { status: 500 }
    );
  }
}
