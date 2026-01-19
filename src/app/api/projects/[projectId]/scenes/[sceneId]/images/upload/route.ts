import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, createMediaAsset } from '@/lib/db-queries';
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
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an image.' }, { status: 400 });
    }

    const imageBuffer = await file.arrayBuffer();
    const uploadResult = await uploadFile({
      file: Buffer.from(imageBuffer),
      organizationId: project.organizationId,
      projectId,
      assetType: 'images',
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
      type: 'image',
      url: uploadResult.url,
      metadata: {
        source: 'custom_upload',
        fileName: file.name,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Error uploading custom image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload image' },
      { status: 500 }
    );
  }
}
