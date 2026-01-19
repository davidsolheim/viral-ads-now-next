import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InferSelectModel } from 'drizzle-orm';
import { getProject, selectScript, getMediaAssetsByProject } from '@/lib/db-queries';
import { eq } from 'drizzle-orm';
import { mediaAssets } from '@/db/schema';

type MediaAsset = InferSelectModel<typeof mediaAssets>;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; scriptId: string }> }
) {
  try {
    const session = await auth();
    const { projectId, scriptId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Select the script
    await selectScript(scriptId, projectId);

    // Clear voiceover and captions when script changes
    // Get all voiceover and caption assets
    const allAssets = await getMediaAssetsByProject(projectId);
    const voiceoverAssets = allAssets.filter((a: MediaAsset) => a.type === 'voiceover');
    
    // Note: We don't delete them, but we mark them as needing regeneration
    // The frontend will handle showing that they need to be regenerated

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error selecting script:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to select script' },
      { status: 500 }
    );
  }
}
