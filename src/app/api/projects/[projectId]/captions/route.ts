import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, updateProjectSettings } from '@/lib/db-queries';
import { z } from 'zod';

const captionsSchema = z.object({
  enabled: z.boolean().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().min(20).max(120).optional(),
  fontColor: z.string().optional(),
  position: z.number().min(10).max(90).optional(),
  wordsPerLine: z.number().min(0).max(10).optional(),
  style: z.object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
  }).optional(),
  effects: z.object({
    outlineColor: z.string().optional(),
    outlineWidth: z.number().min(1).max(10).optional(),
    shadowColor: z.string().optional(),
    shadowOffset: z.number().min(0).max(20).optional(),
    glowColor: z.string().optional(),
    glowSize: z.number().min(0).max(20).optional(),
    highlightColor: z.string().optional(),
  }).optional(),
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

    return NextResponse.json({ captions: project.settings?.captions || {} }, { status: 200 });
  } catch (error) {
    console.error('Error fetching captions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch captions' },
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

    const body = await request.json();
    const captions = captionsSchema.parse(body);

    const settings = project.settings || {};
    const updatedSettings = {
      ...settings,
      captions,
      captions_enabled: captions.enabled ?? settings.captions_enabled ?? true,
    };

    await updateProjectSettings(projectId, updatedSettings);

    return NextResponse.json({ captions: updatedSettings.captions }, { status: 200 });
  } catch (error) {
    console.error('Error saving captions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save captions' },
      { status: 500 }
    );
  }
}
