import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getProject, updateProjectSettings } from '@/lib/db-queries';
import { z } from 'zod';

const updateSettingsSchema = z.object({
  image_model: z.string().optional(),
  video_model: z.string().optional(),
  music_volume: z.number().min(0).max(100).optional(),
  captions_enabled: z.boolean().optional(),
}).passthrough(); // Allow other settings

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
    const settings = updateSettingsSchema.parse(body);

    const currentSettings = (project.settings as any) || {};

    if (currentSettings.flowType === 'manual' && settings.flowType === 'automatic') {
      return NextResponse.json(
        { error: 'Project flow is locked to manual.' },
        { status: 400 }
      );
    }

    const updatedSettings = {
      ...currentSettings,
      ...settings,
      flowTypeLocked:
        currentSettings.flowTypeLocked ||
        settings.flowType === 'manual' ||
        currentSettings.flowType === 'manual',
    };

    await updateProjectSettings(projectId, updatedSettings);

    return NextResponse.json({ settings: updatedSettings }, { status: 200 });
  } catch (error) {
    console.error('Error updating settings:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}
