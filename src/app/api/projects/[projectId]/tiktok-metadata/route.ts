import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, getSelectedScriptByProject, getProductByProject, updateProjectSettings } from '@/lib/db-queries';
import { generateTikTokMetadata } from '@/lib/services/openai';
import { z } from 'zod';

const updateSchema = z.object({
  description: z.string().max(150).optional(),
  hashtags: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
});

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

    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ tiktok: project.settings?.tiktok_metadata || null }, { status: 200 });
  } catch (error) {
    console.error('Error fetching TikTok metadata:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

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

    const product = await getProductByProject(projectId);
    const script = await getSelectedScriptByProject(projectId);
    if (!product || !script) {
      return NextResponse.json({ error: 'Product or script missing' }, { status: 400 });
    }

    const generated = await generateTikTokMetadata({
      productName: product.name,
      script: script.content,
    });

    const settings = project.settings || {};
    const tiktok_metadata = {
      description: generated.description,
      hashtags: generated.hashtags?.slice(0, 5) || [],
      keywords: [],
    };

    await updateProjectSettings(projectId, { ...settings, tiktok_metadata });

    return NextResponse.json({ tiktok: tiktok_metadata }, { status: 201 });
  } catch (error) {
    console.error('Error generating TikTok metadata:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate metadata' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();
    const update = updateSchema.parse(body);

    const settings = project.settings || {};
    const current = settings.tiktok_metadata || {};
    const updated = { ...current, ...update };

    await updateProjectSettings(projectId, { ...settings, tiktok_metadata: updated });

    return NextResponse.json({ tiktok: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating TikTok metadata:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update metadata' },
      { status: 500 }
    );
  }
}
