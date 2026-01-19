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
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    const isWebP = file.type === 'image/webp';
    const isAVIF = file.type === 'image/avif';
    const isHEIC = file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isHEIC) {
      return NextResponse.json({ error: 'Invalid file type. Please upload an image.' }, { status: 400 });
    }

    let imageBuffer: ArrayBuffer;
    let contentType = 'image/jpeg';
    let fileName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';

    if (isWebP || isAVIF || isHEIC) {
      imageBuffer = await file.arrayBuffer();
      // TODO: Convert to JPG using sharp in production
      console.warn('Image format conversion needed for:', file.type);
    } else {
      imageBuffer = await file.arrayBuffer();
      contentType = file.type;
      fileName = file.name;
    }

    const uploadResult = await uploadFile({
      file: Buffer.from(imageBuffer),
      organizationId: project.organizationId,
      projectId,
      assetType: 'images',
      fileName,
      contentType,
      metadata: {
        source: 'reference_upload',
        originalFileName: file.name,
        originalType: file.type,
        converted: (isWebP || isAVIF || isHEIC).toString(),
      },
    });

    const asset = await createMediaAsset({
      projectId,
      type: 'image',
      url: uploadResult.url,
      metadata: {
        source: 'reference',
        fileName,
      },
    });

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Error uploading reference image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload reference image' },
      { status: 500 }
    );
  }
}
