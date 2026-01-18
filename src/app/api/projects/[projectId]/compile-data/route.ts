import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, getScenesByProject, getMediaAssetsByProject } from '@/lib/db-queries';

export async function GET(
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

    // TODO: Check if user has access to the project's organization

    // Get scenes and assets in parallel
    const [scenes, allAssets] = await Promise.all([
      getScenesByProject(projectId),
      getMediaAssetsByProject(projectId),
    ]);

    if (scenes.length === 0) {
      return NextResponse.json(
        { error: 'No scenes found. Please generate scenes first.' },
        { status: 400 }
      );
    }

    const images = allAssets.filter((a: any) => a.type === 'image');
    const voiceovers = allAssets.filter((a: any) => a.type === 'voiceover');
    const music = allAssets.filter((a: any) => a.type === 'music');

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images found. Please generate images first.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      scenes,
      images,
      voiceovers,
      music,
    });
  } catch (error) {
    console.error('Error fetching compile data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch compile data' },
      { status: 500 }
    );
  }
}