import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, createMediaAsset } from '@/lib/db-queries';
import { uploadFile } from '@/lib/services/wasabi';

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

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('audio') as File;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('audio/')) {
      return NextResponse.json({ error: 'Invalid file type. Please upload audio.' }, { status: 400 });
    }

    const audioBuffer = await file.arrayBuffer();
    const uploadResult = await uploadFile({
      file: Buffer.from(audioBuffer),
      organizationId: project.organizationId,
      projectId,
      assetType: 'audio',
      fileName: file.name,
      contentType: file.type,
      metadata: {
        source: 'clone_sample',
        originalFileName: file.name,
        originalType: file.type,
      },
    });

    const asset = await createMediaAsset({
      projectId,
      type: 'voiceover',
      url: uploadResult.url,
      metadata: {
        source: 'clone_sample',
        fileName: file.name,
      },
    });

    return NextResponse.json({ sample: asset }, { status: 201 });
  } catch (error) {
    console.error('Error uploading clone sample:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload clone sample' },
      { status: 500 }
    );
  }
}
